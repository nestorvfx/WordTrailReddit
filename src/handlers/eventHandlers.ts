import { Devvit, TriggerContext, useState} from '@devvit/public-api';

export async function handlePostDelete(event: any, context: TriggerContext): Promise<void> {
  const retryLimit = 5;

  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    try {
      const mainPostID = await context.redis.get('mainPostID');
      if (mainPostID == event.postId) {
        await context.redis.set('mainPostID', '');
        break;
      }
      else {
        const [deletedPostCategoryCode, authorID] = (await context.redis.hGet('postCategories', event.postId) ?? '').split(':');
        if (deletedPostCategoryCode) {
          const txn = await context.redis.watch('latestCategoryCode');
          await txn.multi();

          const currentCategoryInfo = await context.redis.hGet('usersCategories', deletedPostCategoryCode);

          const userUpdates: Record<string, string> = {};

          let usersInCategory = [authorID];

          if (currentCategoryInfo) {
            const [, , , , , highScoreUserID,] = currentCategoryInfo.split(':');

            if (highScoreUserID && !(highScoreUserID == event.author?.id)) {
              usersInCategory.push(highScoreUserID);
            }
            let users = await context.redis.hMGet('userIDs', usersInCategory);

            usersInCategory.forEach((user, index) => {
              const userData = users[index];
              if (userData) {
                userUpdates[user] = userData
                  .split(':')
                  .reduce((result, code, index, array) => {
                    if (code == deletedPostCategoryCode) return result;

                    if ((code == 'c' && (array[index + 1] == deletedPostCategoryCode) && ((array[index + 2] == 'h') || (index == array.length - 2))) ||
                      (code == 'h' && index == array.length - 2 && (array[index + 1] == deletedPostCategoryCode))) {
                      return result;
                    }

                    result.push(code);
                    return result;
                  }, [] as string[])
                  .join(':');
              }
            });

            await txn.hSet('userIDs', userUpdates);
          }

          await txn.hDel('usersCategories', [deletedPostCategoryCode]);
          await txn.hDel('categoriesWords', [deletedPostCategoryCode]);
          
          // Remove category from all sorted sets
          await txn.zRem('categoriesByTime', [deletedPostCategoryCode]);
          await txn.zRem('categoriesByPlays', [deletedPostCategoryCode]);
          await txn.zRem('categoriesByScore', [deletedPostCategoryCode]);

          await txn.exec();
          break;
        }
      }
    }
    catch (error) {
      console.error(`Attempt ${attempt} failed: ${error}`);
      if (attempt == retryLimit) {
        console.error(`Exceeded retry limit. Could not complete operation of deleting post related info.`);
        throw error;
      }
    }
  }
}

/**
 * Creates test categories in batches with delays between them
 */
async function generateTestCategories(context: TriggerContext): Promise<void> {
  // Schedule the first category creation with a 30-second delay
  await context.scheduler.runJob({
    name: 'create_test_category',
    runAt: new Date(Date.now() + 30000), // 30 seconds from now
    data: {
      userIndex: 0,
      categoryIndex: 0,
      categoriesCreated: 0
    }
  });
  
  console.log('Scheduled test categories creation to start in 30 seconds');
}


// Add a new scheduler job to create test categories one at a time
Devvit.addSchedulerJob({
  name: 'create_test_category',
  onRun: async (event, context) => {
    try {
      // Load current progress from event data
      const { userIndex = 0, categoryIndex = 0, categoriesCreated = 0 } = event.data || {};
      
      // Mock users
      const mockUsers: { id: string; name: string }[] = [
        { id: 'user1', name: 'WordMaster42' },
        { id: 'user2', name: 'VocabNinja' },
        { id: 'user3', name: 'PuzzleWhiz' },
        { id: 'user4', name: 'LexiconPro' },
        { id: 'user5', name: 'WordTrailFan' }
      ];
      
      // Word pools to generate random words from
      const wordPools = {
        animals: ['dog', 'cat', 'elephant', 'tiger', 'lion', 'giraffe', 'zebra', 'monkey', 'dolphin', 
          'penguin', 'koala', 'kangaroo', 'panda', 'eagle', 'shark', 'wolf', 'fox', 'bear', 'snake', 'rabbit'],
        fruits: ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'watermelon', 'kiwi', 
          'mango', 'pineapple', 'peach', 'pear', 'plum', 'cherry', 'lemon', 'lime', 'coconut', 'avocado', 'fig', 'papaya'],
        countries: ['usa', 'canada', 'mexico', 'brazil', 'argentina', 'france', 'germany', 'spain', 
          'italy', 'uk', 'russia', 'china', 'japan', 'india', 'australia', 'egypt', 'kenya', 'nigeria', 'greece', 'sweden'],
        sports: ['soccer', 'basketball', 'tennis', 'baseball', 'golf', 'hockey', 'volleyball', 
          'swimming', 'cycling', 'boxing', 'skiing', 'surfing', 'cricket', 'rugby', 'football', 'wrestling', 'gymnastics', 'archery', 'bowling', 'karate'],
        cities: ['paris', 'london', 'tokyo', 'newyork', 'rome', 'sydney', 'berlin', 'madrid', 
          'moscow', 'dubai', 'toronto', 'singapore', 'seoul', 'bangkok', 'istanbul', 'cairo', 'stockholm', 'amsterdam', 'delhi', 'beijing'],
        foods: ['pizza', 'burger', 'pasta', 'sushi', 'taco', 'curry', 'salad', 'steak', 'soup', 
          'sandwich', 'pancake', 'waffle', 'risotto', 'noodles', 'bread', 'icecream', 'chocolate', 'dumpling', 'kebab', 'croissant'],
        movies: ['avatar', 'titanic', 'starwars', 'jaws', 'frozen', 'godfather', 'matrix', 'batman', 
          'avengers', 'jurassic', 'rocky', 'casablanca', 'aliens', 'ghostbusters', 'psycho', 'inception', 'gladiator', 'terminator', 'toy story', 'walle'],
        jobs: ['doctor', 'teacher', 'engineer', 'lawyer', 'chef', 'artist', 'pilot', 'driver',
          'journalist', 'firefighter', 'nurse', 'actor', 'police', 'scientist', 'designer', 'farmer', 'programmer', 'carpenter', 'photographer', 'dancer'],
        colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown', 
          'white', 'black', 'gray', 'cyan', 'magenta', 'gold', 'silver', 'lime', 'navy', 'teal', 'maroon', 'olive'],
        music: ['rock', 'jazz', 'pop', 'hiphop', 'reggae', 'classical', 'blues', 'metal',
          'country', 'folk', 'electronic', 'soul', 'funk', 'rap', 'disco', 'opera', 'punk', 'indie', 'salsa', 'techno']
      };
      
      const categoryThemes = Object.keys(wordPools);
      let latestCategoryCode = await context.redis.get('latestCategoryCode') || '0000000';
      const subreddit = await context.reddit.getCurrentSubreddit();
      const subredditName = subreddit?.name || 'test_subreddit';
      
      // Exit if we've processed all users
      if (typeof userIndex === 'number' && userIndex >= mockUsers.length) {
        console.log(`Completed creating ${categoriesCreated} test categories`);
        
        return;
      }
      
      const user = mockUsers[userIndex as number];
      
      // Create user entry if it doesn't exist and retrieve existing data
      const existingUser = await context.redis.hGet('userIDs', user.id) || user.name;
      let userInfo = existingUser;
      let userCategories: string[] = [];
      
      // Parse existing user categories if present
      if (existingUser.includes(':c:')) {
        const parts = existingUser.split(':c:');
        const categoriesPart = parts[1].split(':h:')[0];
        if (categoriesPart) {
          userCategories = categoriesPart.split(':');
        }
      }
      
      // Create a single category for this job execution
      try {
        // Generate category code
        const categoryCode = (parseInt(latestCategoryCode) + 1).toString().padStart(7, '0');
        latestCategoryCode = categoryCode;
        
        // Pick a random theme for this category
        const theme = categoryThemes[Math.floor(Math.random() * categoryThemes.length)];
        const title = `${user.name}'s ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
        
        // Random metadata
        const playCount = Math.floor(Math.random() * 50) + 1;
        
        // Get words for this category
        const themeWords = wordPools[theme as keyof typeof wordPools];
        // Shuffle and take 10-20 words
        const shuffledWords = [...themeWords].sort(() => 0.5 - Math.random());
        const wordCount = Math.floor(Math.random() * 11) + 10; // 10-20 words
        
        // Process words exactly as in manual category creation (userHandlers.ts)
        const wordsList = shuffledWords
          .slice(0, wordCount)
          .map(word => word.trim())
          .filter(word => word !== '' && /^[a-zA-Z\s]+$/.test(word) && word.length <= 12);
        
        // CRITICAL FIX: Match the exact format from userHandlers.ts - words are joined and UPPERCASE
        const words = wordsList.join(',').toUpperCase();
        
        // Add timestamp (in seconds since epoch) just like manual creation does
        const creationTimestamp = Math.floor(Date.now() / 1000);
        
        // Create post in Reddit
        const post = await context.reddit.submitPost({
          title: `Play ${title} category`, // Match exact title format from manual creation
          subredditName: subredditName,
          preview: (
            Devvit.createElement('blocks', { height: 'tall' },
              Devvit.createElement('vstack', { height: '100%', width: '100%', alignment: 'middle center' },
                Devvit.createElement('text', { size: 'large' }, 'Loading ...')
              )
            )
          )
        });
        
        // Approve the post to make it visible
        await context.reddit.approve(post.id);
        
        // Create the post-to-category mapping
        await context.redis.hSet('postCategories', { [post.id]: `${categoryCode}:${user.id}` });
        
        // Create category data with post ID and timestamp - CRITICAL: initial high score is 0
        // The format must exactly match manual category creation in userHandlers.ts
        const categoryData = `${user.name}:${title}:${playCount}:0:::${post.id}:${creationTimestamp}`;
        
        // Store in Redis
        await context.redis.hSet('usersCategories', { [categoryCode]: categoryData });
        await context.redis.hSet('categoriesWords', { [categoryCode]: words });
        
        // Add to user categories (only in the creator section)
        userCategories.push(categoryCode);
        
        // Update user entry with their created categories only
        userInfo = `${user.name}:c:${userCategories.join(':')}:h:`;
        await context.redis.hSet('userIDs', { [user.id]: userInfo });
        
        // Update the latest category code
        await context.redis.set('latestCategoryCode', latestCategoryCode);
        
        // Add to sorted sets for efficient sorting
        // Timestamp-based sorting (newest first)
        await context.redis.zAdd('categoriesByTime', {
          score: creationTimestamp,
          member: categoryCode
        });
        
        // Play count-based sorting
        await context.redis.zAdd('categoriesByPlays', {
          score: playCount,
          member: categoryCode
        });
        
        // High score-based sorting (initial score is 0)
        await context.redis.zAdd('categoriesByScore', {
          score: 0, // Initial high score
          member: categoryCode
        });
        
        console.log(`Created category ${title} with ID ${categoryCode} for user ${user.name} (${(typeof categoriesCreated === 'number' ? categoriesCreated : 0) + 1}/30)`);
      } catch (error) {
        console.error(`Failed to create category for user ${user.name}:`, error);
      }
      
      // Calculate next user and category index
      let nextUserIndex: number = typeof userIndex === 'number' ? userIndex : 0;
      let nextCategoryIndex = (typeof categoryIndex === 'number' ? categoryIndex : 0) + 1;
      
      // Move to next user after creating 6 categories
      if (nextCategoryIndex >= 6) {
        nextUserIndex += 1;
        nextCategoryIndex = 0;
      }
      
      // Schedule next category creation with 5 seconds delay using Date approach
      if (nextUserIndex < mockUsers.length) {
        await context.scheduler.runJob({
          name: 'create_test_category',
          runAt: new Date(Date.now() + 5000), // 5 seconds from now using Date object
          data: {
            userIndex: nextUserIndex,
            categoryIndex: nextCategoryIndex,
            categoriesCreated: (typeof categoriesCreated === 'number' ? categoriesCreated : 0) + 1
          }
        });
      } else {
        // All categories have been created, create indexes
        console.log(`Completed creating all 30 test categories`);
      }
    } catch (error) {
      console.error('Error in create_test_category job:', error);
    }
  }
});

export async function handleAppInstall(event: any, context: TriggerContext): Promise<void> {
  try {
    // Set up initial scheduler jobs
    await context.scheduler.runJob({
      name: 'initialPost',
      runAt: new Date(Date.now() + 1000),
    });

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setUTCDate(20);
    if (nextMonth.getUTCDate() <= now.getUTCDate()) {
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    }
    nextMonth.setUTCHours(0, 0, 0, 0);

    // Schedule the monthly cleanup job using proper cron syntax
    await context.scheduler.runJob({
      name: 'removeUserDataPeriodically',
      cron: '0 0 20 * *', // Run at midnight (00:00) on the 20th of every month
    });

    // Start the test category generation process
    await generateTestCategories(context);
    
    // Initialize the sorted sets
    // We don't need to populate them yet as new categories will be added to them
    
    console.log('App installed successfully, test categories will be generated with delays');
  } catch (error) {
    console.error('Error during app installation:', error);
  }
}