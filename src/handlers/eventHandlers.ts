import { Devvit, TriggerContext, useState } from "@devvit/public-api";

export async function handlePostDelete(
  event: any,
  context: TriggerContext,
): Promise<void> {
  const retryLimit = 5;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const mainPostID = await context.redis.get("mainPostID");
      if (mainPostID == event.postId) {
        await context.redis.set("mainPostID", "");
        break;
      } else {
        const [deletedPostCategoryCode, authorID] = (
          (await context.redis.hGet("postCategories", event.postId)) ?? ""
        ).split(":");
        if (deletedPostCategoryCode) {
          const txn = await context.redis.watch("latestCategoryCode");
          await txn.multi();

          const currentCategoryInfo = await context.redis.hGet(
            "usersCategories",
            deletedPostCategoryCode,
          );

          const userUpdates: Record<string, string> = {};

          let usersInCategory = [authorID];

          if (currentCategoryInfo) {
            const [, , , , , highScoreUserID] = currentCategoryInfo.split(":");

            if (highScoreUserID && !(highScoreUserID == event.author?.id)) {
              usersInCategory.push(highScoreUserID);
            }
            let users = await context.redis.hMGet("userIDs", usersInCategory);

            usersInCategory.forEach((user, index) => {
              const userData = users[index];
              if (userData) {
                userUpdates[user] = userData
                  .split(":")
                  .reduce((result, code, index, array) => {
                    if (code == deletedPostCategoryCode) return result;

                    if (
                      (code == "c" &&
                        array[index + 1] == deletedPostCategoryCode &&
                        (array[index + 2] == "h" ||
                          index == array.length - 2)) ||
                      (code == "h" &&
                        index == array.length - 2 &&
                        array[index + 1] == deletedPostCategoryCode)
                    ) {
                      return result;
                    }

                    result.push(code);
                    return result;
                  }, [] as string[])
                  .join(":");
              }
            });

            await txn.hSet("userIDs", userUpdates);
          }

          await txn.hDel("usersCategories", [deletedPostCategoryCode]);
          await txn.hDel("categoriesWords", [deletedPostCategoryCode]);

          // Remove category from all sorted sets
          await txn.zRem("categoriesByTime", [deletedPostCategoryCode]);
          await txn.zRem("categoriesByPlays", [deletedPostCategoryCode]);
          await txn.zRem("categoriesByScore", [deletedPostCategoryCode]);

          await txn.exec();
          break;
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        console.error(
          `Exceeded retry limit. Could not complete operation of deleting post related info.`,
        );
        throw error;
      }
    }
  }
}

export async function handleAppInstall(
  event: any,
  context: TriggerContext,
): Promise<void> {
  try {
    // Set up initial scheduler jobs
    await context.scheduler.runJob({
      name: "initialPost",
      runAt: new Date(Date.now() + 1000),
    });

    // Schedule the monthly cleanup job using proper cron syntax
    await context.scheduler.runJob({
      name: "removeUserDataPeriodically",
      cron: "0 0 20 * *", // Run at midnight (00:00) on the 20th of every month
    });
  } catch (error) {
    console.error("Error during app installation:", error);
  }
}
