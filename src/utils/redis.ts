import { Context } from '@devvit/public-api';

export function getNextCode(current: string): string {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let nextValue = current.split('');

  for (let i = nextValue.length - 1; i >= 0; i--) {
    const currentIndex = characters.indexOf(nextValue[i]);
    if (currentIndex < characters.length - 1) {
      nextValue[i] = characters[currentIndex + 1];
      break;
    } else {
      nextValue[i] = characters[0];
    }
  }

  return nextValue.join('');
}

export async function getUserInfo(context: Context, userID: string): Promise<string> {
  const retryLimit = 1;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const value = await context.redis.hGet('userIDs', userID);
      if (value == undefined || value == null) {
        const username = await context.redis.hGet('userIDs', userID) ?? '';
        await context.redis.hSet('userIDs', { [userID]: username });
        return username;
      } else {
        return value;
      }
    }
    catch (error) {
      console.error('Error fetching userInfo:', error);
      if (attempt == retryLimit) {
        console.error(`Exceeded retry limit. Could not complete operation for user info.`);
        return '';
      }
    }
  }
  return '';
}

export async function getLatestCategoryCode(context: Context): Promise<string> {
  const retryLimit = 1;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const value = await context.redis.get('latestCategoryCode');
      if (value == undefined) {
        await context.redis.set('latestCategoryCode', '0000000')
        return '0000000';
      } else if (value == null) {
        return '';
      } else {
        return value;
      }
    } catch (error) {
      console.error('Error fetching latestCategoryCode:', error);
      if (attempt == retryLimit) {
        console.error(`Exceeded retry limit. Could not complete operation for category code.`);
        return '';
      }
    }
  }
  return '';
} 