import { Context } from "@devvit/public-api";

export function getNextCode(current: string): string {
  const characters =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let nextValue = current.split("");

  for (let i = nextValue.length - 1; i >= 0; i--) {
    const currentIndex = characters.indexOf(nextValue[i]);
    if (currentIndex < characters.length - 1) {
      nextValue[i] = characters[currentIndex + 1];
      break;
    } else {
      nextValue[i] = characters[0];
    }
  }

  return nextValue.join("");
}

export async function getUserInfo(
  context: Context,
  userID: string,
): Promise<string> {
  const retryLimit = 1;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const value = await context.redis.hGet("userIDs", userID);
      if (value == undefined || value == null) {
        const username = (await context.redis.hGet("userIDs", userID)) ?? "";
        await context.redis.hSet("userIDs", { [userID]: username });
        return username;
      } else {
        return value;
      }
    } catch (error) {
      // Check if it's the special ServerCallRequired error
      if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
        throw error; // Re-throw this specific error
      }
      
      console.error("Error fetching userInfo:", error);
      if (attempt == retryLimit) {
        console.error(
          `Exceeded retry limit. Could not complete operation for user info.`,
        );
        return "";
      }
    }
  }
  return "";
}

export async function getLatestCategoryCode(context: Context): Promise<string> {
  const retryLimit = 1;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const value = await context.redis.get("latestCategoryCode");
      if (value == undefined) {
        await context.redis.set("latestCategoryCode", "0000000");
        return "0000000";
      } else if (value == null) {
        return "";
      } else {
        return value;
      }
    } catch (error) {
      // Check if it's the special ServerCallRequired error
      if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
        throw error; // Re-throw this specific error
      }
      
      console.error("Error fetching latestCategoryCode:", error);
      if (attempt == retryLimit) {
        console.error(
          `Exceeded retry limit. Could not complete operation for category code.`,
        );
        return "";
      }
    }
  }
  return "";
}

/**
 * Adds a category to all sorted sets for efficient indexing
 */
export async function addCategoryToSortedSets(
  context: Context,
  categoryCode: string,
  creator: string,
  title: string,
  plays: number = 0,
  highScore: number = 0,
  timestamp: number = Math.floor(Date.now() / 1000),
): Promise<void> {
  try {
    // Add to time-based sorted set (newest first)
    await context.redis.zAdd("categoriesByTime", {
      score: timestamp,
      member: categoryCode,
    });

    // Add to plays-based sorted set (most plays first)
    await context.redis.zAdd("categoriesByPlays", {
      score: plays,
      member: categoryCode,
    });

    // Add to high score-based sorted set (highest score first)
    await context.redis.zAdd("categoriesByScore", {
      score: highScore,
      member: categoryCode,
    });
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error("Error adding category to sorted sets:", error);
  }
}

/**
 * Removes a category from all sorted sets
 */
export async function removeCategoryFromSortedSets(
  context: Context,
  categoryCode: string,
): Promise<void> {
  try {
    await context.redis.zRem("categoriesByTime", [categoryCode]);
    await context.redis.zRem("categoriesByPlays", [categoryCode]);
    await context.redis.zRem("categoriesByScore", [categoryCode]);
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error("Error removing category from sorted sets:", error);
  }
}

/**
 * Updates a category in the appropriate sorted set when values change
 */
export async function updateCategoryInSortedSets(
  context: Context,
  categoryCode: string,
  updates: {
    plays?: number;
    highScore?: number;
  },
): Promise<void> {
  try {
    if (updates.plays !== undefined) {
      await context.redis.zAdd("categoriesByPlays", {
        score: updates.plays,
        member: categoryCode,
      });
    }

    if (updates.highScore !== undefined) {
      await context.redis.zAdd("categoriesByScore", {
        score: updates.highScore,
        member: categoryCode,
      });
    }
  } catch (error) {
    // Check if it's the special ServerCallRequired error
    if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
      throw error; // Re-throw this specific error
    }
    
    console.error("Error updating category in sorted sets:", error);
  }
}
