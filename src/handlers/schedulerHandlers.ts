import { JobContext, Devvit } from '@devvit/public-api';
import { LoadingPreview } from '../components/LoadingPreview.js';

export async function initialPost(event: any, context: JobContext): Promise<void> {
  const postOptions = {
    title: 'Word Trail Game',
    subredditName: context.subredditName ?? '',
    preview: LoadingPreview(),
  };
  
  const post = await context.reddit.submitPost(postOptions);
  
  await context.reddit.approve(post.id);
  try {
    await post.sticky();
  } catch (error) {
    console.error(`Failed to sticky post: ${error}`);
    // Continue execution even if stickying fails
  }

  await context.redis.set('mainPostID', post.id);

  const periodicRemoval = await context.scheduler.runJob({
    name: 'removeUserDataPeriodically',
    cron: '* * 20 * *',
  });

  await context.redis.set('periodicRemoval', periodicRemoval);

  const jobs = await context.scheduler.listJobs();
  console.log('Scheduled jobs:', jobs);
}

export async function removeUserDataPeriodically(event: any, context: JobContext): Promise<void> {
  let retries = 0;
  while (retries < 5) {
    try {
      let cursor = 0;

      let userIDsList: string[] = [];

      let updatedCategoriesList: Record<string, string> = {};

      do {
        const scanResponse = await context.redis.hScan('userIDs', cursor);
        for (const iuser of scanResponse.fieldValues) {
          const cUser = await context.reddit.getUserById(iuser.field);
          if (cUser == undefined) {
            userIDsList.push(iuser.field);

            const [beforeH, afterH] = iuser.value.split(':h:');
            const cCategories = beforeH?.includes(':c:') ? beforeH.split(':').slice(2) : [];
            const hCategories = afterH?.split(':') || [];

            if (cCategories.length == 0 && hCategories.length == 0) {
              continue;
            }

            const promises = [];

            if (hCategories.length > 0) {
              promises.push(context.redis.hMGet('usersCategories', hCategories));
            }

            if (cCategories.length > 0) {
              promises.push(context.redis.hMGet('usersCategories', cCategories));
            }

            let highScoreCategoryData = [''];
            let createdCategoryData = [''];

            if (promises.length > 0) {
              const results = await Promise.all(promises);

              let resultIndex = 0;

              if (hCategories.length > 0) {
                highScoreCategoryData = results[resultIndex]?.map((data) => data ?? '') ?? [];
                resultIndex++;
              }

              if (cCategories.length > 0) {
                createdCategoryData = results[resultIndex]?.map((data) => data ?? '') ?? [];
              }
            }

            if (createdCategoryData.length > 0) {
              cCategories.forEach((categoryCode, index) => {
                let getCategoryInfo = createdCategoryData[index];
                if (categoryCode in updatedCategoriesList) {
                  getCategoryInfo = updatedCategoriesList[categoryCode];
                }
                updatedCategoriesList[categoryCode] = getCategoryInfo.length > 0 ? ('[deleted]' + getCategoryInfo.slice(getCategoryInfo.indexOf(':'))) : '';
              });
            }

            if (highScoreCategoryData.length > 0) {
              hCategories.forEach((categoryCode, index) => {
                let getCategoryInfo = highScoreCategoryData[index];
                if (categoryCode in updatedCategoriesList) {
                  getCategoryInfo = updatedCategoriesList[categoryCode];
                }
                updatedCategoriesList[categoryCode] = getCategoryInfo.replace(/(:[^:]+:[^:]+)(:[^:]+)$/, ':[deleted]::$2');
              });
            }
          }
        }
        cursor = scanResponse.cursor;
      } while (cursor != 0)
      
      if (userIDsList.length > 0) {
        const txn = await context.redis.watch('latestCategoryCode');
        await txn.multi();
        await txn.hDel('userIDs', userIDsList);
        await txn.hSet('usersCategories', updatedCategoriesList);
        const tResult = await txn.exec();

        if (tResult == null) {
          retries++;
        } else {
          break;
        }
      }

      break;
    }
    catch (error) {
      console.error('Error in transaction:', error);
      retries++;
    }
  }
}