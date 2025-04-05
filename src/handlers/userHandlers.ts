import { Context } from '@devvit/public-api';
import { WebViewMessage } from '../types.js';
import { getNextCode } from '../utils/redis.js';
import { LoadingPreview } from '../components/LoadingPreview.js';

export async function sendUserData(context: Context, userID: string, postMessage: (message: WebViewMessage) => void): Promise<void> {
  const userData = (await context.redis.hGet('userIDs', userID)) ?? '';

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

export async function createCategory(
  context: Context, 
  values: Record<string, string>, 
  postMessage: (message: WebViewMessage) => void, 
  username: string,
  userID: string
): Promise<void> {
  const retryLimit = 1;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      // Check input validity
      const regexWords = /^([a-zA-Z]+(?: [a-zA-Z]+)*)(?:,([a-zA-Z]+(?: [a-zA-Z]+)*))*$/;
      const regexTitle = /^[a-zA-Z0-9-_ ]{1,16}$/;

      const titleCorrect = regexTitle.test(values.title);

      const wordsList = values.words.replace(/[\n\r]/g, '').split(',').map(element => element.trim()).filter(element => element != '' && /^[a-zA-Z\s]+$/.test(element) && element.length <= 12);

      const words = wordsList.join(',').toUpperCase();
      const wordsRegexCorrect = regexWords.test(words);

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
          title: 'Play ' + values.title + ' category',
          subredditName: context.subredditName ?? '',
          preview: LoadingPreview(),
        };

        const post = await context.reddit.submitPost(postOptions);

        await txn.multi();
        await txn.hSet('postCategories', { [post.id]: newCode + ':' + userID });
        await txn.set('latestCategoryCode', newCode);
        await txn.hSet('usersCategories', {
          [newCode]: username + ":" + values.title + ":0:0:::" + post.id
        });
        await txn.hSet('categoriesWords', {
          [newCode]: words
        });
        await txn.hSet('userIDs', {
          [userID]: newInfo
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
            categoryTitle: values.title
          },
        });
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

        // In the original, it sends the data back to the form to let the user correct it
        // Since we can't recreate the exact form behavior in decoupled mode,
        // we'll just log this and let the UI handle it
        console.log(`Form validation failed - title: ${titleCorrect}, words: ${wordsCorrect}`);
        console.log(`Attempted values - title: ${values.title}, words length: ${wordsList.length}`);

        // Like in original test.tsx, we don't actually send the formIncorrect message
        // but it's here for completeness
        postMessage({
          type: 'formIncorrect',
          data: {
            wordsCorrect: wordsCorrect,
            titleCorrect: titleCorrect
          },
        });
      }
      break;
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
} 