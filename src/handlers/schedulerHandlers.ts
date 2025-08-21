import { JobContext, Devvit } from "@devvit/public-api";
import { LoadingPreview } from "../components/LoadingPreview.js";

export async function initialPost(
  event: any,
  context: JobContext,
): Promise<void> {
  const postOptions = {
    title: "Word Trail Game",
    subredditName: context.subredditName ?? "",
    preview: LoadingPreview(),
  };

  const post = await context.reddit.submitPost(postOptions);

  await context.reddit.approve(post.id);
  try {
    await post.sticky();
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error(`Failed to sticky post: ${error}`);
    // Continue execution even if stickying fails
  }

  await context.redis.set("mainPostID", post.id);

  const jobs = await context.scheduler.listJobs();
}

export async function removeUserDataPeriodically(
  event: any,
  context: JobContext,
): Promise<void> {
  let retries = 0;
  while (retries < 5) {
    try {
      let cursor = 0;

      let userIDsList: string[] = [];

      let updatedCategoriesList: Record<string, string> = {};

      do {
        const scanResponse = await context.redis.hScan("userIDs", cursor);
        for (const iuser of scanResponse.fieldValues) {
          let cUser;
          try {
            cUser = await context.reddit.getUserById(iuser.field);
          } catch (error) {
            // User not found (deleted account) - treat as undefined
            cUser = undefined;
          }
          if (cUser == undefined) {
            userIDsList.push(iuser.field);

            const [beforeH, afterH] = iuser.value.split(":h:");
            const cCategories = beforeH?.includes(":c:")
              ? beforeH.split(":").slice(2)
              : [];
            const hCategories = afterH?.split(":") || [];

            if (cCategories.length == 0 && hCategories.length == 0) {
              continue;
            }

            const promises = [];

            if (hCategories.length > 0) {
              promises.push(
                context.redis.hMGet("usersCategories", hCategories),
              );
            }

            if (cCategories.length > 0) {
              promises.push(
                context.redis.hMGet("usersCategories", cCategories),
              );
            }

            let highScoreCategoryData = [""];
            let createdCategoryData = [""];

            if (promises.length > 0) {
              const results = await Promise.all(promises);

              let resultIndex = 0;

              if (hCategories.length > 0) {
                highScoreCategoryData =
                  results[resultIndex]?.map((data) => data ?? "") ?? [];
                resultIndex++;
              }

              if (cCategories.length > 0) {
                createdCategoryData =
                  results[resultIndex]?.map((data) => data ?? "") ?? [];
              }
            }

            if (createdCategoryData.length > 0) {
              cCategories.forEach((categoryCode, index) => {
                let getCategoryInfo = createdCategoryData[index];
                if (categoryCode in updatedCategoriesList) {
                  getCategoryInfo = updatedCategoriesList[categoryCode];
                }
                updatedCategoriesList[categoryCode] =
                  getCategoryInfo.length > 0
                    ? "[deleted]" +
                      getCategoryInfo.slice(getCategoryInfo.indexOf(":"))
                    : "";
              });
            }

            if (highScoreCategoryData.length > 0) {
              hCategories.forEach((categoryCode, index) => {
                let getCategoryInfo = highScoreCategoryData[index];
                if (categoryCode in updatedCategoriesList) {
                  getCategoryInfo = updatedCategoriesList[categoryCode];
                }
                updatedCategoriesList[categoryCode] = getCategoryInfo.replace(
                  /(:[^:]+:[^:]+)(:[^:]+)$/,
                  ":[deleted]::$2",
                );
              });
            }
          }
        }
        cursor = scanResponse.cursor;
      } while (cursor != 0);

      if (userIDsList.length > 0) {
        const txn = await context.redis.watch("latestCategoryCode");
        await txn.multi();
        await txn.hDel("userIDs", userIDsList);
        await txn.hSet("usersCategories", updatedCategoriesList);

        // If we're modifying categories whose creators are deleted, make sure we don't
        // need to remove any categories from sorted sets. If removing categories becomes
        // part of this function in the future, add sorted set removal here.

        const tResult = await txn.exec();

        if (tResult == null) {
          retries++;
        } else {
          break;
        }
      }

      break;
    } catch (error) {
      // Check if it's the special ServerCallRequired error
      if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
        throw error; // Re-throw this specific error
      }
      
      console.error("Error in transaction:", error);
      retries++;
    }
  }
}

export async function cleanupTrendingCategories(
  event: any,
  context: JobContext,
): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 86400;

    // Get all trending categories with scores
    const allTrending = await context.redis.zRange(
      "categoriesByTrending",
      0,
      -1,
      {
        by: "rank",
        reverse: false,
      },
    );

    // Check each category's timestamp and remove if expired
    const expiredCategories: string[] = [];

    for (const category of allTrending) {
      // Get the score to check timestamp
      const score = await context.redis.zScore(
        "categoriesByTrending",
        category.member,
      );
      if (score !== null && score !== undefined) {
        const lastUpdateTime = Math.floor(parseFloat(score.toString()));
        if (lastUpdateTime < thirtyDaysAgo) {
          expiredCategories.push(category.member);
        }
      }
    }

    if (expiredCategories.length > 0) {
      await context.redis.zRem("categoriesByTrending", expiredCategories);
    }
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error("Error cleaning up trending categories:", error);
  }
}
