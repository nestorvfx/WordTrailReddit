import { Context } from '@devvit/public-api';
import { WebViewMessage, CategoryUpdateInfo } from '../types.js';
import { getNextCode } from '../utils/redis.js';

export async function sendCategories(context: Context, cursor: number, postMessage: (message: WebViewMessage) => void): Promise<void> {
  const categoriesScan = await context.redis.hScan('usersCategories', cursor);

  const processedCategories = categoriesScan.fieldValues.map(item => {
    const value = item.value;
    const parts = value.split(':');
    if (parts.length <= 7) {
      const now = Math.floor(Date.now() / 1000);
      return `${item.field}:${value}:${now}`;
    } else {
      return `${item.field}:${value}`;
    }
  });

  const result = processedCategories.join(';');

  postMessage({
    type: 'sendCategories',
    data: {
      usersCategories: result,
      cursor: categoriesScan.cursor
    },
  });
}

export async function sendWords(context: Context, categoryCode: string, postMessage: (message: WebViewMessage) => void): Promise<void> {
  const categoryWords = (await context.redis.hGet('categoriesWords', categoryCode)) ?? 'error';

  postMessage({
    type: 'sendCategoryWords',
    data: {
      words: categoryWords
    },
  });
}

export async function updateCategoryInfo(context: Context, categoryInfo: CategoryUpdateInfo, postMessage: (message: WebViewMessage) => void, username: string, userID: string): Promise<void> {
  let retryLimit = 1;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      let feedback = 'NOTHS';
      let returnInfo = '';
      const previousInfo = ((await context.redis.hGet('usersCategories', categoryInfo.categoryCode)) ?? '').split(':');
      let newInfo = previousInfo;
      let cUserInfo = await context.redis.hGet('userIDs', userID) ?? '';
      const post = await context.reddit.getPostById(previousInfo[6]);
      
      if (cUserInfo == '' || post == undefined) {
        continue;
      }

      let commentText = 'Just scored ' + categoryInfo.newScore;
      const txn = await context.redis.watch('latestCategoryCode');
      await txn.multi();
      
      // Fix: Explicitly parse both values to ensure consistent type handling
      const previousScore = parseInt(previousInfo[3]);
      const newScore = parseInt(String(categoryInfo.newScore));
      
      if (previousScore < newScore) {
        if (categoryInfo.guessedAll) {
          commentText = '**GUESSED ALL ' + categoryInfo.newScore + ' CORRECTLY**';
        }
        else {
          commentText = '**HIGH SCORED** with **' + categoryInfo.newScore + '**';
        }
        newInfo[3] = String(newScore); // Ensure we're storing a string
        newInfo[4] = username;
        newInfo[5] = userID;
        feedback = 'NEWHS';

        // Update previous high scorer's user info
        if (previousInfo[5] != userID) {
          let previousHSInfo = (await context.redis.hGet('userIDs', previousInfo[5])) ?? '';
          if (previousHSInfo.includes(':h:')) {
            const hsIndex = previousHSInfo.indexOf(':h:');
            previousHSInfo = previousHSInfo.split(':')
              .reduce((result, code, index, array) => {
                if (code == categoryInfo.categoryCode && index > hsIndex) return result;

                if (index > 0 && code == 'h' && index == array.length - 2 && (array[index + 1] == categoryInfo.categoryCode)) {
                  return result;
                }

                result.push(code);
                return result;
              }, [] as string[])
              .join(':');
          }
          await txn.hSet('userIDs', {
            [previousInfo[5]]: previousHSInfo
          });
        }

        // Update current user's info
        if (cUserInfo.includes(':h:')) {
          const afterH = cUserInfo.split(':h:')[1];
          if (afterH && !afterH.includes(categoryInfo.categoryCode)) {
            cUserInfo += ':' + categoryInfo.categoryCode;
          }
        }
        else {
          cUserInfo += ':h:' + categoryInfo.categoryCode;
        }

        await txn.hSet('userIDs', {
          [userID]: cUserInfo
        });
      } else {
        returnInfo = previousInfo[4] + ':' + previousInfo[3];
      }

      newInfo[2] = (parseInt(previousInfo[2]) + 1).toString();
      await txn.hSet('usersCategories', {
        [categoryInfo.categoryCode]: newInfo.join(':')
      });

      await txn.exec();

      // Add comment to post with retry logic
      let commentSuccess = false;
      const commentRetries = 3; // Number of retries for comment posting
      let comment = null;
      
      for (let commentAttempt = 1; commentAttempt <= commentRetries; commentAttempt++) {
        try {
          comment = await post.addComment({
            text: commentText
          });
          
          if (comment != null) {
            await context.reddit.approve(comment.id);
            commentSuccess = true;
            break;
          }
        } catch (error) {
          console.error(`Comment attempt ${commentAttempt} failed: ${error}`);
          if (commentAttempt < commentRetries) {
            // Wait a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!commentSuccess) {
        //console.warn(`Failed to post comment after ${commentRetries} attempts. Continuing without posting comment.`);
      }

      postMessage({
        type: 'updateCategoryFeedback',
        data: {
          information: feedback,
          categoryInfo: returnInfo
        },
      });

      break;
    }
    catch (error) {
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        console.error(`Exceeded retry limit. Could not complete operation for userID: ${userID}`);
        throw error;
      }
    }
  }
}

export async function deleteCategory(context: Context, categoryCode: string, userID: string, postMessage: (message: WebViewMessage) => void): Promise<void> {
  const retryLimit = 5;
  let deleted = false;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const currentCategoryInfo = await context.redis.hGet('usersCategories', categoryCode);
      if (!currentCategoryInfo) {
        continue;
      }
      const userUpdates: Record<string, string> = {};
      let usersInCategory = [userID];
      const [, , , , , highScoreUserID, postID] = currentCategoryInfo.split(':');

      if (highScoreUserID && !(highScoreUserID == userID)) {
        usersInCategory.push(highScoreUserID);
      }
      let users = await context.redis.hMGet('userIDs', usersInCategory);

      usersInCategory.forEach((user, index) => {
        const userData = users[index];
        if (userData) {
          userUpdates[user] = userData
            .split(':')
            .reduce((result, code, index, array) => {
              if (code == categoryCode) return result;

              if ((code == 'c' && (array[index + 1] == categoryCode) && ((array[index + 2] == 'h') || (index == array.length - 2))) ||
                (code == 'h' && index == array.length - 2 && (array[index + 1] == categoryCode))) {
                return result;
              }

              result.push(code);
              return result;
            }, [] as string[])
            .join(':');
        }
      });
      
      const deletePost: Promise<void>[] = [];
      deletePost.push(context.reddit.remove(postID, false));
      const results = await Promise.allSettled(deletePost);
      for (const result of results) {
        if (result && result.status == 'rejected') {
          console.error('Post deleting rejected.' + result.toString())
        }
      }

      const txn = await context.redis.watch('latestCategoryCode');
      await txn.multi();
      await txn.hSet('userIDs', userUpdates);

      await txn.hDel('usersCategories', [categoryCode]);
      await txn.hDel('categoriesWords', [categoryCode]);
      await txn.hDel('postCategories', [postID]);

      await txn.exec();

      await context.reddit.remove(postID, false);

      deleted = true;
      break;
    }
    catch (error) {
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        console.error(`Exceeded retry limit. Could not complete operation for userID: ${userID}`);
        throw error;
      }
    }
  }

  postMessage({
    type: 'categoryDeleted',
    data: {
      deleted: deleted
    },
  });
}

export async function deleteAllUserData(context: Context, userID: string, postMessage: (message: WebViewMessage) => void): Promise<void> {
  const retryLimit = 5;
  let deleted = false;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const userData = await context.redis.hGet('userIDs', userID);
      if (!userData) {
        console.error(`User with ID ${userID} not found.`);
        break;
      }

      const [beforeH, afterH] = userData.split(':h:');
      const createdCategories = beforeH?.includes(':c:') ? beforeH.split(':').slice(2) : [];
      let highScoreCategories = afterH?.split(':') || [];

      if (createdCategories.length == 0 && highScoreCategories.length == 0) {
        const txn = await context.redis.watch('latestCategoryCode');
        await txn.multi();
        await txn.hDel('userIDs', [userID]);
        await txn.exec();
        deleted = true;
        break;
      }

      highScoreCategories = highScoreCategories.filter(
        (category) => !createdCategories.includes(category)
      );

      const promises = [];

      if (highScoreCategories.length > 0) {
        promises.push(context.redis.hMGet('usersCategories', highScoreCategories));
      }

      if (createdCategories.length > 0) {
        promises.push(context.redis.hMGet('usersCategories', createdCategories));
      }

      let highScoreCategoryData = [''];
      let createdCategoryData = [''];

      if (promises.length > 0) {
        const results = await Promise.all(promises);

        let resultIndex = 0;

        if (highScoreCategories.length > 0) {
          highScoreCategoryData = results[resultIndex]?.map((data) => data ?? '') ?? [];
          resultIndex++;
        }

        if (createdCategories.length > 0) {
          createdCategoryData = results[resultIndex]?.map((data) => data ?? '') ?? [];
        }
      }

      const highScorerIDs = new Array<string>();
      const highScoreUpdates: Record<string, string> = {};
      const deletingPromises: Promise<void>[] = [];
      const postCategories = [''];

      if (createdCategoryData.length > 0) {
        createdCategoryData.forEach((categoryData, index) => {
          if (categoryData) {
            const [, , , , , highScoreUserID, postID] = categoryData.split(':');
            deletingPromises.push(context.reddit.remove(postID, false));

            if (highScoreUserID && highScoreUserID != userID) {
              highScorerIDs.push(highScoreUserID);
            }
          }
        });
      }

      if (highScoreCategoryData.length > 0) {
        highScoreCategories.forEach((categoryCode, index) => {
          const categoryData = highScoreCategoryData[index];
          if (categoryData) {
            // Preserve the timestamp (7th index) if it exists
            const parts = categoryData.split(':');
            const timestamp = parts.length > 7 ? parts[7] : '';
            const postID = parts[6];
            const creator = parts[0];
            const title = parts[1];
            const plays = parts[2];
            
            // Include timestamp in updated category data if it exists
            const updatedValue = timestamp ? 
              `${creator}:${title}:${plays}:0:::${postID}:${timestamp}` :
              `${creator}:${title}:${plays}:0:::${postID}`;
              
            highScoreUpdates[categoryCode] = updatedValue;
          }
        });
      }

      const userHighScoreUpdates: Record<string, string> = {};
      if (highScorerIDs.length > 0) {
        const highScorerData = await context.redis.hMGet('userIDs', highScorerIDs);

        highScorerIDs.forEach((highScorerID, index) => {
          const userData = highScorerData[index];
          if (userData) {
            const updatedData = userData
              .split(':')
              .reduce((result, code, index, array) => {
                if (createdCategories.includes(code)) return result;

                if ((code == 'c' && createdCategories.includes(array[index + 1]) && ((array[index + 2] == 'h') || (index == array.length - 2))) ||
                  (code == 'h' && index == array.length - 2 && createdCategories.includes(array[index + 1]))) {
                  return result;
                }

                result.push(code);
                return result;
              }, [] as string[])
              .join(':');
            userHighScoreUpdates[highScorerID] = updatedData;
          }
        });
      }

      const deleteResults = await Promise.allSettled(deletingPromises);
      for (const r of deleteResults) {
        if (r && r.status == 'rejected') {
          console.error('Deleting rejected.' + r.toString());
        }
      }

      const txn = await context.redis.watch('latestCategoryCode');
      await txn.multi();

      if (Object.keys(highScoreUpdates).length > 0) {
        await txn.hSet('usersCategories', highScoreUpdates);
      }

      if (Object.keys(userHighScoreUpdates).length > 0) {
        await txn.hSet('userIDs', userHighScoreUpdates);
      }

      if (createdCategories.length > 0) {
        await txn.hDel('usersCategories', createdCategories);
        await txn.hDel('categoriesWords', createdCategories);
        await txn.hDel('postCategories', postCategories);
      }

      await txn.hDel('userIDs', [userID]);

      await txn.exec();

      deleted = true;
      break;
    }
    catch (error) {
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        console.error(`Exceeded retry limit. Could not complete operation for userID: ${userID}`);
        throw error;
      }
    }
  }

  postMessage({
    type: 'allDataDeleted',
    data: {
      deleted: deleted
    },
  });
}