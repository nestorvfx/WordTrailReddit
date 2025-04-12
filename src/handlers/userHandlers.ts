import { Context } from '@devvit/public-api';
import { WebViewMessage } from '../types.js';
import { getNextCode, getUserInfo, addCategoryToSortedSets } from '../utils/redis.js';
import { LoadingPreview } from '../components/LoadingPreview.js';

export async function sendUserData(context: Context, userID: string, postMessage: (message: WebViewMessage) => void): Promise<void> {
  const userData = (await context.redis.hGet('userIDs', userID)) ?? '';
  
  // Check if user data contains the created categories marker
  if (!userData.includes(':c:')) {
    // No created categories, send empty data immediately
    postMessage({
      type: 'sendUserData',
      data: {
        createdCategories: ''
      },
    });
    return;
  }
  
  const [, , ...categories] = userData.split(':');
  const hIndex = categories.indexOf('h');

  const validHIndex = hIndex == -1 ? categories.length : hIndex;

  const cCategories = categories.slice(0, validHIndex);
  const hCategories = categories.slice(validHIndex);

  let createdCategories = '';
  if (cCategories.length > 0 && cCategories[0] != '') {
    const createdCategoriesList = (await context.redis.hMGet('usersCategories', cCategories)) ?? '';
    createdCategories = cCategories.map((item, index) => `${item}:${createdCategoriesList[index]}`).join(';');
  }

  postMessage({
    type: 'sendUserData',
    data: {
      createdCategories: createdCategories
    },
  });
}

export async function createCategory(context: Context, userID: string, categoryTitle: string, words: string, postMessage: (message: WebViewMessage) => void): Promise<boolean> {
  const retryLimit = 5;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      // Check input validity
      const regexWords = /^([a-zA-Z]+(?: [a-zA-Z]+)*)(?:,([a-zA-Z]+(?: [a-zA-Z]+)*))*$/;
      const regexTitle = /^[a-zA-Z0-9-_ ]{1,16}$/;

      const titleCorrect = regexTitle.test(categoryTitle);

      // Fix type error by explicitly declaring type
      const wordsList: string[] = words.replace(/[\n\r]/g, '').split(',').map(element => element.trim()).filter(element => element != '' && /^[a-zA-Z\s]+$/.test(element) && element.length <= 12);

      // Fix name collision by using a different variable name
      const wordsString: string = wordsList.join(',').toUpperCase();
      const wordsRegexCorrect = regexWords.test(wordsString);

      const wordsCorrect = wordsRegexCorrect && wordsList.length >= 10 && wordsList.length <= 100;

      if (wordsCorrect && titleCorrect) {
        // Create new category
        const currentCode = await context.redis.get('latestCategoryCode');
        if (currentCode == undefined) {
          continue;
        }
        const newCode = getNextCode(currentCode);

        let cUserInfo = await context.redis.hGet('userIDs', userID) ?? '';
        if (cUserInfo == '') {
          continue;
        }
        let newInfo = cUserInfo.includes(':c:') ? ':' + newCode : ':c:' + newCode;
        const hIndex = cUserInfo.indexOf(':h:');
        newInfo = hIndex != -1
          ? cUserInfo.slice(0, hIndex) + newInfo + cUserInfo.slice(hIndex)
          : cUserInfo + newInfo;

        const txn = await context.redis.watch('latestCategoryCode');

        // Use the LoadingPreview component for the preview
        const postOptions = {
          title: 'Play ' + categoryTitle + ' category',
          subredditName: context.subredditName ?? '',
          preview: LoadingPreview(),
        };

        const post = await context.reddit.submitPost(postOptions);

        // Add timestamp (in seconds since epoch) when the category was created
        const timestamp = Math.floor(Date.now() / 1000);

        const categoryInfo = `${cUserInfo.split(':')[0]}:${categoryTitle}:0:0:::${post.id}:${timestamp}`;

        await txn.multi();
        await txn.hSet('postCategories', { [post.id]: newCode + ':' + userID });
        await txn.set('latestCategoryCode', newCode);
        await txn.hSet('usersCategories', {
          [newCode]: categoryInfo
        });
        
        await txn.hSet('categoriesWords', {
          [newCode]: wordsString  // Use the correct variable name
        });
        await txn.hSet('userIDs', {
          [userID]: newInfo
        });

        // Use timestamp as score for time-based sorting
        await txn.zAdd('categoriesByTime', {
          score: timestamp,
          member: newCode
        });

        // Initial plays count is 0
        await txn.zAdd('categoriesByPlays', {
          score: 0,
          member: newCode
        });

        // Initial high score is 0
        await txn.zAdd('categoriesByScore', {
          score: 0,
          member: newCode
        });

        await txn.exec();

        if (post != null) {
          await context.reddit.approve(post.id);
        }

        context.ui.showToast({
          text: 'Post created!',
          appearance: 'success'
        });

        postMessage({
          type: 'formCorrect',
          data: {
            categoryTitle: categoryTitle
          },
        });
        
        console.log(`[DEBUG_CATEGORY] Category creation completed for: ${categoryTitle}`);
        return true; // Validation passed and category created successfully
      }
      else {
        let toastMessage = '';
        if (!wordsCorrect && !titleCorrect) {
          toastMessage = 'Both fields have been incorrectly submitted';
        }
        else if (!wordsCorrect) { 
          toastMessage = 'Words field has been incorrectly submitted'; 
        }
        else if (!titleCorrect) {
          toastMessage = 'Title field has been incorrectly submitted';
        }
        
        context.ui.showToast({
          text: toastMessage,
          appearance: 'neutral'
        });

        console.log(`Form validation failed - title: ${titleCorrect}, words: ${wordsCorrect}`);
        console.log(`Attempted values - title: ${categoryTitle}, words length: ${wordsList.length}`);

        return false; // Return false to indicate validation failure
      }
    }
    catch (error) {
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        postMessage({
          type: 'formCorrect',
          data: {
            categoryTitle: ''
          },
        });
        console.error(`Exceeded retry limit. Could not complete operation for creating category.`);
        throw error;
      }
    }
  }
  return false; // Default return value if all attempts failed
}