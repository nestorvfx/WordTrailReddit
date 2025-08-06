import { Context } from "@devvit/public-api";
import { WebViewMessage, CategoryUpdateInfo } from "../types.js";
import {
  getNextCode,
  addCategoryToSortedSets,
  removeCategoryFromSortedSets,
  updateCategoryInSortedSets,
} from "../utils/redis.js";

export async function sendCategories(
  context: Context,
  cursor: number,
  sortMethod: string = "time",
  postMessage: (message: WebViewMessage) => void,
  reversed: boolean = false,
): Promise<void> {
  const pageSize = 500; // Number of categories per page (changed from 20 to 500)
  const start = cursor * pageSize;
  const stop = start + pageSize - 1;

  // Determine which sorted set to use based on the sort method
  const sortedSetKey =
    sortMethod === "time"
      ? "categoriesByTime"
      : sortMethod === "plays"
        ? "categoriesByPlays"
        : sortMethod === "trending"
          ? "categoriesByTrending"
          : "categoriesByScore";

  try {
    let sortedCategories;

    // Special handling for trending sort (30-day filter)
    if (sortMethod === "trending") {
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 86400;

      // Get all trending categories first
      const allTrending = await context.redis.zRange(sortedSetKey, 0, -1, {
        by: "rank",
        reverse: !reversed,
      });

      // Filter to last 30 days and apply pagination
      const recentCategories: any[] = [];
      for (const category of allTrending) {
        const score = await context.redis.zScore(
          "categoriesByTrending",
          category.member,
        );
        if (score !== null && score !== undefined) {
          const lastUpdateTime = Math.floor(parseFloat(score.toString()));
          if (lastUpdateTime >= thirtyDaysAgo) {
            recentCategories.push(category);
          }
        }
      }

      // Apply pagination to filtered results
      const startIndex = start;
      const endIndex = Math.min(stop + 1, recentCategories.length);
      sortedCategories = recentCategories.slice(startIndex, endIndex);
    } else {
      // Normal handling for other sort methods
      sortedCategories = await context.redis.zRange(sortedSetKey, start, stop, {
        by: "rank",
        reverse: !reversed,
      });
    }

    if (sortedCategories.length === 0) {
      // No categories found, send empty result
      postMessage({
        type: "sendCategories",
        data: {
          usersCategories: "",
          cursor: 0,
        },
      });
      return;
    }

    // Get full category data for the sorted category codes
    const categoryData = await context.redis.hMGet(
      "usersCategories",
      sortedCategories.map((category) => category.member),
    );

    // Format the results in the expected format: categoryCode:categoryData
    const processedCategories = sortedCategories
      .map((category, index) => {
        if (!categoryData[index]) return "";
        return `${category.member}:${categoryData[index]}`;
      })
      .filter(Boolean); // Remove any empty strings

    const result = processedCategories.join(";");

    // Check if there are more categories after this page
    const totalCategories = await context.redis.zCard(sortedSetKey);
    const hasMoreCategories = start + sortedCategories.length < totalCategories;

    // Send the sorted categories back to the client
    postMessage({
      type: "sendCategories",
      data: {
        usersCategories: result,
        cursor: hasMoreCategories ? cursor + 1 : 0,
      },
    });
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error("Error sending categories:", error);
    // Send empty result on error
    postMessage({
      type: "sendCategories",
      data: {
        usersCategories: "",
        cursor: 0,
      },
    });
  }
}

export async function sendWords(
  context: Context,
  categoryCode: string,
  postMessage: (message: WebViewMessage) => void,
): Promise<void> {
  const categoryWords =
    (await context.redis.hGet("categoriesWords", categoryCode)) ?? "error";

  postMessage({
    type: "sendCategoryWords",
    data: {
      words: categoryWords,
    },
  });
}

export async function updateCategoryInfo(
  context: Context,
  categoryInfo: CategoryUpdateInfo,
  postMessage: (message: WebViewMessage) => void,
  username: string,
  userID: string,
): Promise<void> {
  const executionId = `score_${userID}_${categoryInfo.categoryCode}_${Date.now()}`;

  const duplicateCheck = await context.redis.get(`exec_${executionId}`);
  if (duplicateCheck) {
    postMessage({
      type: "updateCategoryFeedback",
      data: { information: "NOTHS", categoryInfo: "" },
    });
    return;
  }

  await context.redis.set(`exec_${executionId}`, "processing", {
    expiration: new Date(Date.now() + 30000),
  });

  try {
    let feedback = "NOTHS";
    let returnInfo = "";
    const previousInfo = (
      (await context.redis.hGet(
        "usersCategories",
        categoryInfo.categoryCode,
      )) ?? ""
    ).split(":");
    let newInfo = [...previousInfo]; // Create copy to avoid mutation
    let cUserInfo = (await context.redis.hGet("userIDs", userID)) ?? "";
    const post = await context.reddit.getPostById(previousInfo[6]);

    if (cUserInfo == "" || post == undefined) {
      throw new Error("Critical data unavailable");
    }

    const newScoreValue = Math.max(
      0,
      parseInt(String(categoryInfo.newScore || 0)) || 0,
    );
    const originalRawScore = categoryInfo.newScore;

    let transactionSucceeded = false;
    let commentText = "";

    const txn = await context.redis.watch("latestCategoryCode");
    await txn.multi();

    const previousScore = parseInt(previousInfo[3]);

    const newPlayCount = parseInt(previousInfo[2]) + 1;
    newInfo[2] = newPlayCount.toString();

    await txn.zAdd("categoriesByPlays", {
      score: newPlayCount,
      member: categoryInfo.categoryCode,
    });

    const now = Math.floor(Date.now() / 1000);
    const categoryTimestamp = parseInt(previousInfo[7]);
    const daysSinceCreation = (now - categoryTimestamp) / 86400;
    const averageePlaysPerDay = newPlayCount / Math.max(1, daysSinceCreation);
    const recentActivityFactor = Math.min(15, averageePlaysPerDay);
    const recencyBonus = Math.max(0, 30 - daysSinceCreation);
    const popularityScore = Math.log(1 + newPlayCount) * 3;
    const activityScore =
      recentActivityFactor * 30 + popularityScore + recencyBonus;
    const trendingScore = parseFloat(
      `${now}.${Math.min(99999, Math.floor(activityScore))}`,
    );

    await txn.zAdd("categoriesByTrending", {
      score: trendingScore,
      member: categoryInfo.categoryCode,
    });

    if (previousScore < newScoreValue) {
      newInfo[3] = String(newScoreValue);
      newInfo[4] = username;
      newInfo[5] = userID;
      feedback = "NEWHS";

      await txn.zAdd("categoriesByScore", {
        score: newScoreValue,
        member: categoryInfo.categoryCode,
      });

      if (previousInfo[5] != userID) {
        let previousHSInfo =
          (await context.redis.hGet("userIDs", previousInfo[5])) ?? "";
        if (previousHSInfo.includes(":h:")) {
          const hsIndex = previousHSInfo.indexOf(":h:");
          previousHSInfo = previousHSInfo
            .split(":")
            .reduce((result, code, index, array) => {
              if (code == categoryInfo.categoryCode && index > hsIndex)
                return result;

              if (
                index > 0 &&
                code == "h" &&
                index == array.length - 2 &&
                array[index + 1] == categoryInfo.categoryCode
              ) {
                return result;
              }

              result.push(code);
              return result;
            }, [] as string[])
            .join(":");
        }
        await txn.hSet("userIDs", {
          [previousInfo[5]]: previousHSInfo,
        });
      }

      // Update current user's info
      if (cUserInfo.includes(":h:")) {
        const afterH = cUserInfo.split(":h:")[1];
        if (afterH && !afterH.includes(categoryInfo.categoryCode)) {
          cUserInfo += ":" + categoryInfo.categoryCode;
        }
      } else {
        cUserInfo += ":h:" + categoryInfo.categoryCode;
      }

      await txn.hSet("userIDs", {
        [userID]: cUserInfo,
      });
    } else {
      returnInfo = previousInfo[4] + ":" + previousInfo[3];
    }

    await txn.hSet("usersCategories", {
      [categoryInfo.categoryCode]: newInfo.join(":"),
    });

    const txnResult = await txn.exec();
    transactionSucceeded = txnResult !== null;

    postMessage({
      type: "updateCategoryFeedback",
      data: {
        information: feedback,
        categoryInfo: returnInfo,
      },
    });

    await context.redis.set(`exec_${executionId}`, "completed", {
      expiration: new Date(Date.now() + 300000),
    });

    if (transactionSucceeded) {
      setTimeout(async () => {
        try {
          if (categoryInfo.guessedAll) {
            commentText = `**GUESSED ALL ${newScoreValue} CORRECTLY**`;
          } else if (previousScore < newScoreValue) {
            commentText = `**HIGH SCORED** with **${newScoreValue}**`;
          } else {
            commentText = `Just scored ${newScoreValue}`;
          }

          const comment = await post.addComment({ text: commentText });

          if (comment != null) {
            await context.reddit.approve(comment.id);
          }
        } catch (commentError) {
          // Check if it's the special ServerCallRequired error
          if (commentError && typeof commentError === 'object' && 'message' in commentError && commentError.message === 'ServerCallRequired') {
            throw commentError; // Re-throw this specific error
          }
          
          console.error(`Comment posting failed: ${commentError}`);
        }
      }, 0);
    } else {
      throw new Error("Redis transaction failed");
    }
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error(
      `Operation failed for userID=${userID}, score=${categoryInfo.newScore}: ${error}`,
    );

    postMessage({
      type: "updateCategoryFeedback",
      data: {
        information: "NOTHS",
        categoryInfo: "",
      },
    });

    await context.redis.set(`exec_${executionId}`, "failed", {
      expiration: new Date(Date.now() + 60000),
    });
  }
}

export async function deleteCategory(
  context: Context,
  categoryCode: string,
  userID: string,
  postMessage: (message: WebViewMessage) => void,
): Promise<void> {
  const retryLimit = 5;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      // Get the post ID for the category
      const categoryInfo = await context.redis.hGet(
        "usersCategories",
        categoryCode,
      );
      if (!categoryInfo) {
        postMessage({
          type: "deleteCategoryResponse",
          data: { success: false, message: "Category not found" },
        });
        return;
      }

      // Get post ID from category info
      const postId = categoryInfo.split(":")[6];

      // Delete the post
      if (postId) {
        try {
          await context.reddit.remove(postId, false);
        } catch (removeError) {
          // Check if it's the special ServerCallRequired error
          if (removeError && typeof removeError === 'object' && 'message' in removeError && removeError.message === 'ServerCallRequired') {
            throw removeError; // Re-throw this specific error
          }
          
          // Post might already be deleted or not accessible, continue with other cleanup
        }
      }

      // Update user data to remove this category
      const userData = await context.redis.hGet("userIDs", userID);
      if (userData) {
        const parts = userData.split(":");
        const newUserData = parts
          .filter((part) => part !== categoryCode)
          .join(":");
        await context.redis.hSet("userIDs", { [userID]: newUserData });
      }

      // Remove from Redis collections
      await context.redis.hDel("usersCategories", [categoryCode]);
      await context.redis.hDel("categoriesWords", [categoryCode]);
      await context.redis.zRem("categoriesByTime", [categoryCode]);
      await context.redis.zRem("categoriesByPlays", [categoryCode]);
      await context.redis.zRem("categoriesByScore", [categoryCode]);
      await context.redis.zRem("categoriesByTrending", [categoryCode]);

      if (postId) {
        await context.redis.hDel("postCategories", [postId]);
      }

      postMessage({
        type: "deleteCategoryResponse",
        data: {
          success: true,
          categoryCode: categoryCode,
        },
      });

      return;
    } catch (error) {
      // Check if it's the special ServerCallRequired error
      if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
        throw error; // Re-throw this specific error
      }
      
      // Only try again if we haven't reached the retry limit
      if (attempt === retryLimit) {
        postMessage({
          type: "deleteCategoryResponse",
          data: {
            success: true,
            message: "Category deleted with some warnings",
          },
        });
        return;
      }
    }
  }
}

export async function deleteAllUserData(
  context: Context,
  userID: string,
  postMessage: (message: WebViewMessage) => void,
): Promise<void> {
  const retryLimit = 5;
  let deleted = false;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const userData = await context.redis.hGet("userIDs", userID);
      if (!userData) {
        console.error(`User with ID ${userID} not found.`);
        break;
      }

      const [beforeH, afterH] = userData.split(":h:");
      const createdCategories = beforeH?.includes(":c:")
        ? beforeH.split(":").slice(2)
        : [];
      let highScoreCategories = afterH?.split(":") || [];

      if (createdCategories.length == 0 && highScoreCategories.length == 0) {
        const txn = await context.redis.watch("latestCategoryCode");
        await txn.multi();
        await txn.hDel("userIDs", [userID]);
        await txn.exec();
        deleted = true;
        break;
      }

      highScoreCategories = highScoreCategories.filter(
        (category) => !createdCategories.includes(category),
      );

      const promises = [];

      if (highScoreCategories.length > 0) {
        promises.push(
          context.redis.hMGet("usersCategories", highScoreCategories),
        );
      }

      if (createdCategories.length > 0) {
        promises.push(
          context.redis.hMGet("usersCategories", createdCategories),
        );
      }

      let highScoreCategoryData = [""];
      let createdCategoryData = [""];

      if (promises.length > 0) {
        const results = await Promise.all(promises);

        let resultIndex = 0;

        if (highScoreCategories.length > 0) {
          highScoreCategoryData =
            results[resultIndex]?.map((data) => data ?? "") ?? [];
          resultIndex++;
        }

        if (createdCategories.length > 0) {
          createdCategoryData =
            results[resultIndex]?.map((data) => data ?? "") ?? [];
        }
      }

      const highScorerIDs = new Array<string>();
      const highScoreUpdates: Record<string, string> = {};
      const deletingPromises: Promise<void>[] = [];
      const postCategories = [""];

      if (createdCategoryData.length > 0) {
        createdCategoryData.forEach((categoryData, index) => {
          if (categoryData) {
            const [, , , , , highScoreUserID, postID] = categoryData.split(":");
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
            const parts = categoryData.split(":");
            const timestamp = parts.length > 7 ? parts[7] : "";
            const postID = parts[6];
            const creator = parts[0];
            const title = parts[1];
            const plays = parts[2];

            const updatedValue = timestamp
              ? `${creator}:${title}:${plays}:0:::${postID}:${timestamp}`
              : `${creator}:${title}:${plays}:0:::${postID}`;

            highScoreUpdates[categoryCode] = updatedValue;
          }
        });
      }

      const userHighScoreUpdates: Record<string, string> = {};
      if (highScorerIDs.length > 0) {
        const highScorerData = await context.redis.hMGet(
          "userIDs",
          highScorerIDs,
        );

        highScorerIDs.forEach((highScorerID, index) => {
          const userData = highScorerData[index];
          if (userData) {
            const updatedData = userData
              .split(":")
              .reduce((result, code, index, array) => {
                if (createdCategories.includes(code)) return result;

                if (
                  (code == "c" &&
                    createdCategories.includes(array[index + 1]) &&
                    (array[index + 2] == "h" || index == array.length - 2)) ||
                  (code == "h" &&
                    index == array.length - 2 &&
                    createdCategories.includes(array[index + 1]))
                ) {
                  return result;
                }

                result.push(code);
                return result;
              }, [] as string[])
              .join(":");
            userHighScoreUpdates[highScorerID] = updatedData;
          }
        });
      }

      const deleteResults = await Promise.allSettled(deletingPromises);
      for (const r of deleteResults) {
        if (r && r.status == "rejected") {
          console.error("Deleting rejected." + r.toString());
        }
      }

      const txn = await context.redis.watch("latestCategoryCode");
      await txn.multi();

      if (Object.keys(highScoreUpdates).length > 0) {
        await txn.hSet("usersCategories", highScoreUpdates);
      }

      if (Object.keys(userHighScoreUpdates).length > 0) {
        await txn.hSet("userIDs", userHighScoreUpdates);
      }

      if (createdCategories.length > 0) {
        await txn.hDel("usersCategories", createdCategories);
        await txn.hDel("categoriesWords", createdCategories);
        await txn.hDel("postCategories", postCategories);

        for (const categoryCode of createdCategories) {
          await txn.zRem("categoriesByTime", [categoryCode]);
          await txn.zRem("categoriesByPlays", [categoryCode]);
          await txn.zRem("categoriesByScore", [categoryCode]);
          await txn.zRem("categoriesByTrending", [categoryCode]);
        }
      }

      await txn.hDel("userIDs", [userID]);

      await txn.exec();

      deleted = true;
      break;
    } catch (error) {
      // Check if it's the special ServerCallRequired error
      if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
        throw error; // Re-throw this specific error
      }
      
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        console.error(
          `Exceeded retry limit. Could not complete operation for userID: ${userID}`,
        );
        throw error;
      }
    }
  }

  postMessage({
    type: "allDataDeleted",
    data: {
      deleted: deleted,
    },
  });
}
