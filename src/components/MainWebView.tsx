import { Devvit, useState, useForm, useInterval, useWebView } from '@devvit/public-api';
import { WebViewMessage } from '../types.js';
import { sendCategories, sendWords, updateCategoryInfo, deleteCategory, deleteAllUserData } from '../handlers/categoryHandlers.js';
import { sendUserData, createCategory } from '../handlers/userHandlers.js';
import { LoadingPreview } from './LoadingPreview.js';

export const MainWebView = (context: any) => {
  const isInMaintenanceWindow = () => {
    const now = new Date();
    const day = now.getUTCDate();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    // If it's the 20th day at midnight hour (00:xx)
    if (day === 20 && hour === 0) {
      // If within first 5 minutes, return minutes since midnight
      if (minute < 5) {
        return minute;
      }
    }
    
    // If not in maintenance window, return negative value to indicate time until maintenance
    // or large positive value to indicate past maintenance
    if (day === 19 && hour === 23) {
      return -((60 - minute) + 0.1); // Minutes until maintenance
    }
    
    return day < 20 ? -1000 : 1000; // Far outside the maintenance window
  }

  const [diffInMinutes, setDiffInMinutes] = useState(isInMaintenanceWindow());
  const [isItPeriodicRemoval, setIsItPeriodicRemoval] = useState(false);

  const periodCheck = () => {
    // Check if we're currently in maintenance window (first 5 minutes of 20th)
    if (0 <= diffInMinutes && diffInMinutes <= 5) {
      setIsItPeriodicRemoval(true);
    } 
    // Check if we're approaching maintenance (negative minutes)
    else if (diffInMinutes < 0 && diffInMinutes > -100) { // Only schedule if reasonably close
      useInterval(() => {
        setIsItPeriodicRemoval(true);
      }, Math.max(Math.abs(diffInMinutes) * 60000 + 50, 1000)).start();
    }
  };

  periodCheck();

  const [user] = useState(async () => {
    const retryLimit = 1;

    for (let attempt = 1; attempt <= retryLimit; attempt++) {
      try {
        const currUser = await context.reddit.getCurrentUser();
        if (currUser == undefined) {
          continue;
        }
        const moderatorPermissions = await currUser.getModPermissionsForSubreddit(context.subredditName ?? '');
        if (moderatorPermissions == undefined) {
          continue;
        }
        return `${currUser?.username}:${moderatorPermissions.length > 0 ? 'y' : 'n'}`;
      }
      catch (error) {
        console.error(`Attempt ${attempt} failed: ${error}`);
        if (attempt == retryLimit) {
          console.error(`Exceeded retry limit. Could not complete operation for sending category info.`);
          return '[guestUser]:n';
          throw error;
        }
      }
    }
    return '[guestUser]:n';
  });

  const [username] = useState(() => { return user.split(':')[0] });
  const [userID] = useState(() => { return context.userId ?? '' });
  const [isUserModerator] = useState(() => { return user.split(':')[1] == 'y' });

  const [isOnlyModerators] = useState(async () => { return (await context.settings.get('moderator-categories') ?? false) });

  const [userAllowedToCreate] = useState((isOnlyModerators && isUserModerator) || !isOnlyModerators);

  const [currentUserInfo, setCurrentUserInfo] = useState(async () => {
    const retryLimit = 1;
    for (let attempt = 1; attempt <= retryLimit; attempt++) {
      try {
        const value = await context.redis.hGet('userIDs', userID);
        if (value == undefined || value == null) {
          await context.redis.hSet('userIDs', { [userID]: username });
          return username;
        } else {
          return value;
        }
      }
      catch (error) {
        console.error('Error fetching userInfo:', error);
        if (attempt == retryLimit) {
          console.error(`Exceeded retry limit. Could not complete operation for sending category info.`);
          return '';
        }
      }
    }
    return '';
  });

  const [latestCategoryCode, setLatestCategoryCode] = useState(async () => {
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
          console.error(`Exceeded retry limit. Could not complete operation for sending category info.`);
          return '';
        }
      }
    }
    return '';
  });

  const [webviewVisible, setWebviewVisible] = useState(false);
  const [formInputs, setFormInputs] = useState({ title: '', words: '' });

  const [typeOfPost] = useState(async () => {
    return (context.postId == (await context.redis.get('mainPostID') ?? '') ? 0 : (await context.redis.hGet('postCategories', context.postId ?? '') ? 1 : 2));
  });

  const [postCategory] = useState(async () => {
    if (typeOfPost == 0) {
      return '';
    } else if (typeOfPost == 1) {
      const [categoryCode,] = (await context.redis.hGet('postCategories', context.postId ?? '') ?? '').split(':');
      const categoryInfo = await context.redis.hGet('usersCategories', categoryCode) ?? '';
      const categoryWords = await context.redis.hGet('categoriesWords', categoryCode) ?? '';
      if (categoryCode && categoryInfo && categoryWords) {
        return categoryCode + ':' + categoryInfo + ':' + categoryWords;
      }
      else {
        return '';
      }
    } else {
      return '';
    }
  });

  const { mount, postMessage } = useWebView({
    url: "page.html",

    onMessage: async (message: WebViewMessage) => {
      setDiffInMinutes(isInMaintenanceWindow());
      setIsItPeriodicRemoval(0 <= diffInMinutes && diffInMinutes <= 5);
      if (!isItPeriodicRemoval) {
        switch (message.type) {
          case 'updateCategories':
            await sendCategories(context, message.data.cursor, message.data.sortMethod || 'time', postMessage);
            break;
          case 'requestUserData':
            await sendUserData(context, userID, postMessage);
            break;
          case 'startForm':
            await startForm();
            break;
          case 'wordsRequest':
            await sendWords(context, message.data.categoryCode, postMessage);
            break;
          case 'updateCategoryInfo':
            await updateCategoryInfo(context, message.data, postMessage, username, userID);
            break;
          case 'deleteCategory':
            await deleteCategory(context, message.data.categoryCode, userID, postMessage);
            break;
          case 'deleteAllUserData':
            await deleteAllUserData(context, userID, postMessage);
            break;
          case 'webViewStarted':
            webViewStarted();
            break;
          default:
            throw new Error(`Unknown message type: ${message.type}`);
        }
      }
    },
    onUnmount: () => {
      // Cleanup if needed
    },
  });

  const myForm = useForm(
    (data) => {
      return {
        title: 'Create Category',
        description: 'Post will be created for each category',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Category title (e.g. Popular TV Shows)',
            helpText: "How will category be displayed to other users. Using up to 16 from a-Z 0-9 - _ and space characters",
            required: true,
            defaultValue: data?.title || ''  // Use previous value if available
          },
          {
            type: 'paragraph',
            name: 'words',
            label: 'Words (e.g. word, trail, game, example)',
            helpText: "Write at least 10 (and at most 100) entries separated with (,) Each with no more than 12 characters (a-Z and space)",
            required: true,
            defaultValue: data?.words || ''  // Use previous value if available
          },
        ],
      } as const;
    },
    async (event) => {
      // The boolean return value indicates whether form validation passed
      const success = await createCategory(context, userID, event.title, event.words, postMessage);
      
      // If validation failed, reopen the form with the previously entered values
      if (!success) {
        // Reopen the form with the same values so user can correct them
        context.ui.showForm(myForm, { 
          title: event.title, 
          words: event.words 
        });
      } else {
        // If successful, disable pointer events (as in original code)
       // document.body.style.pointerEvents = 'none';
      }
    }
  );

  const startForm = async () => {
    let correctly = 'false';
    // Check category limit based on moderator status
    let maxCategories = isOnlyModerators && isUserModerator ? 999 : 10;
    if (userAllowedToCreate) {
      const userInfoArray = (await context.redis.hGet('userIDs', userID) ?? '').split(':');
      if (userInfoArray && userInfoArray[0] != '') {
        if (userInfoArray.slice(userInfoArray.indexOf('c') + 1, userInfoArray.indexOf('h') == -1 ? userInfoArray.length : userInfoArray.indexOf('h')).length < maxCategories) {
          correctly = 'true';
          context.ui.showForm(myForm, { title: '', words: '' });
        } else {
          correctly = 'exceeded'
        }
      } else {
        correctly = 'false';
      }
    }
    postMessage({
      type: 'formOpened',
      data: { correctly: correctly },
    });
  };

  const onShowWebview = () => {
    // Only show webview if not in maintenance period
    if (!isItPeriodicRemoval) {
      mount();
      setWebviewVisible(true);
    }
  };

  const webViewStarted = () => {
    postMessage({
      type: 'initialData',
      data: {
        username: username,
        userID: userID,
        userAllowedToCreate: userAllowedToCreate,
        postType: typeOfPost == 0 ? 'mainPost' : (typeOfPost == 1 ? 'categoryPost:' + postCategory : '')
      },
    });
  };

  return (
    <blocks height="tall">
      <vstack grow padding="small" width="100%" height="100%">
        {isItPeriodicRemoval && <vstack
          grow={true}
          height={'100%'}
          alignment="middle center"
        >
          <text size="xlarge" weight="bold">
            Word Trail
          </text>
          <spacer />
          <vstack alignment="middle center">
            <text size="medium" weight="bold">Maintenance in progress. Try again</text>
            <text size="medium" weight="bold">in a few minutes.</text>
          </vstack>
        </vstack>}

        {!isItPeriodicRemoval && <zstack grow={!webviewVisible} alignment="center middle" width="100%" height={webviewVisible ? '0%' : '100%'}>
          <image
            url="Word Trail Image.jpg"
            imageWidth={1500}
            imageHeight={1024}
            grow={!webviewVisible}
            height={webviewVisible ? '0%' : '100%'}
            width="100%"
            resizeMode="cover"
            description="background image"
          />
          {typeOfPost == 0 && <vstack
            grow={!webviewVisible}
            height={webviewVisible ? '0%' : '100%'}
            alignment="middle center"
          >
            <button icon='play' appearance="primary" onPress={onShowWebview}>ENTER</button>
          </vstack>}
          {typeOfPost == 1 && <vstack
            grow={!webviewVisible}
            height={webviewVisible ? '0%' : '100%'}
            alignment="middle center"
          >
            <spacer />
            <text size="xxlarge" weight="bold" color='#f2fffd' outline='thin'>
              {postCategory.split(':')[2]} Category
            </text>
            <spacer />
            <text size="xlarge" weight="bold" color='#f2fffd' outline='thin'>
              High Score:
            </text>
            <spacer />
            <text size="xlarge" weight="bold" color='#f2fffd' outline='thin'>
              {postCategory.split(':')[4]}
            </text>
            <spacer />
            {parseInt(postCategory.split(':')[4]) > 0 && <text size="xxlarge" weight="bold" color='#f2fffd' outline='thin'>
              By {postCategory.split(':')[5]}
            </text>}
            <spacer />
            <button icon='play' appearance="primary" onPress={onShowWebview}>START</button>
          </vstack>}
        </zstack>}
      </vstack>
    </blocks>
  );
};