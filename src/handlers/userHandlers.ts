import { Context } from "@devvit/public-api";
import { WebViewMessage } from "../types.js";
import {
  getNextCode,
  getUserInfo,
  addCategoryToSortedSets,
} from "../utils/redis.js";
import { LoadingPreview } from "../components/LoadingPreview.js";

export async function sendUserData(
  context: Context,
  userID: string,
  postMessage: (message: WebViewMessage) => void,
): Promise<void> {
  const userData = (await context.redis.hGet("userIDs", userID)) ?? "";

  if (!userData.includes(":c:")) {
    postMessage({
      type: "sendUserData",
      data: {
        createdCategories: "",
      },
    });
    return;
  }

  const [, , ...categories] = userData.split(":");
  const hIndex = categories.indexOf("h");

  const validHIndex = hIndex == -1 ? categories.length : hIndex;

  const cCategories = categories.slice(0, validHIndex);
  const hCategories = categories.slice(validHIndex);

  let createdCategories = "";
  if (cCategories.length > 0 && cCategories[0] != "") {
    const createdCategoriesList =
      (await context.redis.hMGet("usersCategories", cCategories)) ?? "";
    createdCategories = cCategories
      .map((item, index) => `${item}:${createdCategoriesList[index]}`)
      .join(";");
  }

  postMessage({
    type: "sendUserData",
    data: {
      createdCategories: createdCategories,
    },
  });
}

export async function createCategory(
  context: Context,
  userID: string,
  categoryTitle: string,
  words: string,
  postMessage: (message: WebViewMessage) => void,
): Promise<boolean> {
  const retryLimit = 5;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const regexWords =
        /^([a-zA-Z]+(?: [a-zA-Z]+)*)(?:,([a-zA-Z]+(?: [a-zA-Z]+)*))*$/;
      const regexTitle = /^[a-zA-Z0-9-_ ]{1,16}$/;

      const titleCorrect = regexTitle.test(categoryTitle);

      const wordsList: string[] = words
        .replace(/[\n\r]/g, "")
        .split(",")
        .map((element) => element.trim())
        .filter(
          (element) =>
            element != "" &&
            /^[a-zA-Z\s]+$/.test(element) &&
            element.length <= 12,
        );
      const wordsString: string = wordsList.join(",").toUpperCase();
      const wordsRegexCorrect = regexWords.test(wordsString);
      const wordsCorrect =
        wordsRegexCorrect && wordsList.length >= 10 && wordsList.length <= 100;

      if (wordsCorrect && titleCorrect) {
        const currentCode = await context.redis.get("latestCategoryCode");
        if (currentCode == undefined) {
          continue;
        }
        const newCode = getNextCode(currentCode);

        let cUserInfo = (await context.redis.hGet("userIDs", userID)) ?? "";
        if (cUserInfo == "") {
          continue;
        }

        let newInfo = cUserInfo.includes(":c:")
          ? ":" + newCode
          : ":c:" + newCode;
        const hIndex = cUserInfo.indexOf(":h:");
        newInfo =
          hIndex != -1
            ? cUserInfo.slice(0, hIndex) + newInfo + cUserInfo.slice(hIndex)
            : cUserInfo + newInfo;

        const txn = await context.redis.watch("latestCategoryCode");

        const postOptions = {
          title: "Play " + categoryTitle + " category",
          subredditName: context.subredditName ?? "",
          preview: LoadingPreview(),
        };

        const post = await context.reddit.submitPost(postOptions);
        const timestamp = Math.floor(Date.now() / 1000);

        const categoryInfo = `${cUserInfo.split(":")[0]}:${categoryTitle}:0:0:::${post.id}:${timestamp}`;

        await txn.multi();
        await txn.hSet("postCategories", { [post.id]: newCode + ":" + userID });
        await txn.set("latestCategoryCode", newCode);
        await txn.hSet("usersCategories", {
          [newCode]: categoryInfo,
        });

        await txn.hSet("categoriesWords", {
          [newCode]: wordsString,
        });
        await txn.hSet("userIDs", {
          [userID]: newInfo,
        });

        // Add to sorted sets for efficient retrieval
        await txn.zAdd("categoriesByTime", {
          score: timestamp,
          member: newCode,
        });

        await txn.zAdd("categoriesByPlays", {
          score: 0,
          member: newCode,
        });

        await txn.zAdd("categoriesByScore", {
          score: 0,
          member: newCode,
        });

        const initialTrendingScore = parseFloat(`${timestamp}.30`);
        await txn.zAdd("categoriesByTrending", {
          score: initialTrendingScore,
          member: newCode,
        });

        await txn.exec();

        if (post != null) {
          await context.reddit.approve(post.id);
        }

        context.ui.showToast({
          text: "Post created!",
          appearance: "success",
        });

        postMessage({
          type: "formCorrect",
          data: {
            categoryTitle: categoryTitle,
          },
        });

        return true;
      } else {
        let toastMessage = "";
        if (!wordsCorrect && !titleCorrect) {
          toastMessage = "Both fields have been incorrectly submitted";
        } else if (!wordsCorrect) {
          toastMessage = "Words field has been incorrectly submitted";
        } else if (!titleCorrect) {
          toastMessage = "Title field has been incorrectly submitted";
        }

        context.ui.showToast({
          text: toastMessage,
          appearance: "neutral",
        });

        postMessage({
          type: "formIncorrect",
          data: {
            wordsCorrect: wordsCorrect,
            titleCorrect: titleCorrect,
          },
        });

        return false;
      }
    } catch (error) {
      // Check if it's the special ServerCallRequired error
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        error.message === "ServerCallRequired"
      ) {
        throw error; // Re-throw this specific error
      }

      if (attempt == retryLimit) {
        postMessage({
          type: "formCorrect",
          data: {
            categoryTitle: "",
          },
        });

        return false;
      }
    }
  }
  return false;
}
