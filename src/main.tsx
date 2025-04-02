import './createPost.js';

import { Devvit, useState, useForm, useInterval, useWebView } from '@devvit/public-api';

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
    | {
        type: 'initialData';
        data: {
            username: string,
            userID: string,
            userAllowedToCreate: boolean,
            postType: string
        };
    }
    | {
        type: 'sendCategories';
        data: {
            usersCategories: string,
            cursor: number
        };
    }
    | {
        type: 'sendCategory';
        data: {
            category: string
        };
    }
    | {
        type: 'requestUserData';
        data: {
        };
    }
    | {
        type: 'sendUserData';
        data: {
            createdCategories: string,
        };
    }
    | {
        type: 'updateCategories';
        data: {
            cursor: number
        };
    }
    | {
        type: 'deleteCategory';
        data: {
            categoryCode: string
        };
    }
    | {
        type: 'categoryDeleted';
        data: {
            deleted: boolean
        };
    }
    | {
        type: 'deleteAllUserData';
        data: {
        };
    }
    | {
        type: 'allDataDeleted';
        data: {
            deleted: boolean
        };
    }
    | {
        type: 'startForm';
        data: {};
    }
    | {
        type: 'formOpened';
        data: {
            correctly: string
        };
    }
    | {
        type: 'formCorrect';
        data: {
            categoryTitle: string
        };
    }
    | {
        type: 'formIncorrect';
        data: {
            wordsCorrect: boolean,
            titleCorrect: boolean
        };
    }
    | {
        type: 'wordsRequest';
        data: {
            categoryCode: string
        };
    }
    | {
        type: 'sendCategoryWords';
        data: {
            words: string
        };
    }
    | {
        type: 'updateCategoryInfo';
        data: {
            categoryCode: string,
            newScore: number,
            guessedAll: boolean
        };
    }
    | {
        type: 'webViewStarted';
        data: {
        };
    }
    | {
        type: 'categoryUpdateFeedback';
        data: {
            information: string,
        };
    };

Devvit.configure({
    redditAPI: true,
});

/*
 userID : {c+ categoryCode: y/n, h+categoryCode: y/n}
 'latestCategoryCode': Latest category code (used for referencing categories)
 'usersCategories': { categoryCode: "createdByUsername:categoryTitle:numOfTimesPlayed:HighScoreForCategory:HighScoreSetByWho" , categoryCode1: ...}
 'categoriesWords': { categoryCode: categoryWords } 
 */

/*
 * 1. 'userIDs' (Hash)
 *    - Key: userID
 *    - Value: "username:c:categoryCode1:categoryCode2...:h:categoryCodeH1:categoryCodeH2" (between c and h are created categories, after h are the ones where user holds high score)
 *  
 *
 * 2. `latestCategoryCode` (String)
 *    - The latest generated category code.
 *
 * 3. `usersCategories` (Hash)
 *    - Key: `categoryCode`
 *    - Value: "creator:categoryTitle:plays:highScore:highScoreUserName:highScoreUserID:postID"
 *
 * 4. `categoriesWords` (Hash)
 *    - Key: `categoryCode`
 *    - Value: Comma-separated words for the category.
 * 
 * 5. `postCategories` (Hash)
 *    - Key: `postID`
 *    - Value: categoryCode:authorID
 */



// Add a custom post type to Devvit
Devvit.addCustomPostType({
    name: 'Main WebView',
    height: 'tall',
    render: (context) => {
        const isWithin5MinutesIn20thUTC = () => {
            const now = new Date();
            return (Date.now() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20)) / 60000;
        }

        //TESTING FUNCTION
        /*const isWithin5MinutesIn20thUTC = () => {
            return (Date.now() - new Date().setUTCHours(2, 10, 0, 0)) / 60000;
        };*/

        const [diffInMinutes, setDiffInMinutes] = useState(isWithin5MinutesIn20thUTC());
        const [isItPeriodicRemoval, setIsItPeriodicRemoval] = useState(false);

        const periodCheck = () => {
            if (-0.1 < diffInMinutes && diffInMinutes <= 5) {
                setIsItPeriodicRemoval(true);
            } else if (diffInMinutes < 0) {
                useInterval(() => {
                    setIsItPeriodicRemoval(true);
                }, Math.max(-diffInMinutes * 60000 - 0.05, 1000)).start();
            }
        };

        periodCheck();

        // Load username with `useAsync` hook
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

        // Create a reactive state for web view visibility
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

            // When the web view invokes `window.parent.postMessage` this function is called
            onMessage: async (message) => {
                setDiffInMinutes(isWithin5MinutesIn20thUTC());
                setIsItPeriodicRemoval(-0.1 < diffInMinutes && diffInMinutes <= 5);
                if (!isItPeriodicRemoval) {
                    switch (message.type) {
                        case 'updateCategories':
                            await sendCategories(message.data.cursor);
                            break;
                        case 'requestUserData':
                            await sendUserData();
                            break;
                        case 'startForm':
                            await startForm();
                            break;
                        case 'wordsRequest':
                            await sendWords(message.data.categoryCode);
                            break;
                        case 'updateCategoryInfo':
                            await updateCategoryInfo(message.data);
                            break;
                        case 'deleteCategory':
                            await deleteCategory(message.data.categoryCode);
                            break;
                        case 'deleteAllUserData':
                            await deleteAllUserData();
                            break;
                        case 'webViewStarted':
                            webViewStarted();
                            break;
                        default:
                            throw new Error(`Unknown message type`);
                    }
                }
            },
            onUnmount: () => {
                //  context.ui.showToast('Web view closed!');
            },
        });


        const sendCategories = async (cursor: number) => {
            // If there are more users, situations that send larger amounts of potentially data should be handled additionally
            const categoriesScan = await context.redis.hScan('usersCategories', cursor);


            // Putting categories into string (could be added filtering filter(element => !element.startsWith(username)) to prevent same user playing their category...)
            let result = categoriesScan.fieldValues
                .map(item => `${item.field}:${item.value}`)
                .join(';');

            postMessage({
                type: 'sendCategories',
                data: {
                    usersCategories: result,
                    cursor: categoriesScan.cursor
                },
            });

            // setCategoriesCursor(categoriesScan.cursor);
        };

        /* const sendCategory = async (categoryCode: string) => {
             const retryLimit = 5;
         
             for (let attempt = 1; attempt <= retryLimit; attempt++) {
                 try {
                     const category = (await context.redis.hGet('usersCategories', categoryCode)) ?? '';
         
                     if (category == undefined) {
                         continue;
                     }
         
                     postMessage({
                         type: 'sendCategory',
                         data: {
                             category: category
                         },
                     });
         
                     break;
                 }
                 catch (error) {
                     console.error(`Attempt ${attempt} failed: ${error}`);
                     if (attempt == retryLimit) {
                         postMessage({
                             type: 'sendCategory',
                             data: {
                                 category: ''
                             },
                         });
                         console.error(`Exceeded retry limit. Could not complete operation for sending category info.`);
                         throw error;
                     }
                 }
             }
         };*/

        const sendWords = async (categoryCode: string) => {
            const categoryWords = (await context.redis.hGet('categoriesWords', categoryCode)) ?? 'error';

            postMessage({
                type: 'sendCategoryWords',
                data: {
                    words: categoryWords
                },
            });
        };

        const updateCategoryInfo = async (categoryInfo: Record<string, any>) => {
            let retryLimit = 1;
            for (let attempt = 1; attempt <= retryLimit; attempt++) {
                try {
                    let feedback = 'NOTHS';
                    let returnInfo = '';
                    const previousInfo = ((await context.redis.hGet('usersCategories', categoryInfo.categoryCode)) ?? '').split(':');
                    let newInfo = previousInfo;
                    let cUserInfo = await context.redis.hGet('userIDs', userID) ?? '';
                    const post = await context.reddit.getPostById(previousInfo[6]);
                    // const previousPostInfo = await context.redis.hGet('postCategories', post.id);

                    if (cUserInfo == '' || post == undefined /*|| previousPostInfo == undefined*/) {
                        continue;
                    }

                    let commentText = 'Just scored ' + categoryInfo.newScore;
                    const txn = await context.redis.watch('latestCategoryCode');
                    await txn.multi();
                    if (parseInt(previousInfo[3]) < categoryInfo.newScore) {
                        if (categoryInfo.guessedAll) {
                            commentText = '**GUESSED ALL ' + categoryInfo.newScore + ' CORRECTLY**';
                        }
                        else {
                            commentText = '**HIGH SCORED** with **' + categoryInfo.newScore + '**';
                        }
                        newInfo[3] = categoryInfo.newScore;
                        newInfo[4] = username;
                        newInfo[5] = userID;
                        feedback = 'NEWHS';

                        // Remove high score from previous holder
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
                                [categoryInfo.previousHSID]: previousHSInfo
                            });
                        }

                        // Add high score to current user
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

                    // Post comment to category post
                    const comment = await post.addComment({
                        text: commentText
                    });

                    if (comment == null) {
                        continue;
                    }

                    await context.reddit.approve(comment.id);

                    if (commentText.startsWith('**')) {
                        await comment.distinguishAsAdmin(true);
                    }

                    /* CONSIDER STORING COMMENT IDs and removing them with other data when requested. It would make for more complex
                    handling of database, and it's also not necessary on it's own. Unless it's on me to remove them.
                    await txn.hSet('postCategories', { [post.id]: previousPostInfo+':'+comment.id });*/

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
        };

        const sendUserData = async () => {
            const userData = (await context.redis.hGet('userIDs', userID)) ?? '';

            const [, , ...categories] = userData.split(':');
            const hIndex = categories.indexOf('h');

            const validHIndex = hIndex == -1 ? categories.length : hIndex;

            const cCategories = categories.slice(0, validHIndex);
            const hCategories = categories.slice(validHIndex);

            let createdCategories = '';
            if (cCategories.length > 0 && cCategories[0] != '') {
                const createdCategoriesList = (await context.redis.hMGet('usersCategories', cCategories)) ?? '';
                createdCategories = cCategories.map((item, index) => `${item}:${createdCategoriesList[index]}`).join(';');
            }

            postMessage({
                type: 'sendUserData',
                data: {
                    createdCategories: createdCategories
                },
            });
        };

        // Form for submitting words
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
                            defaultValue: data.title
                        },
                        {
                            type: 'paragraph',
                            name: 'words',
                            label: 'Words (e.g. word, trail, game, example)',
                            helpText: "Write at least 10 (and at most 100) entries separated with (,) Each with no more than 12 characters (a-Z and space)",
                            required: true,
                            defaultValue: data.words
                        },
                    ],
                } as const;
            },
            async (event) => {
                await createCategory(event);
            }
        );

        const startForm = async () => {
            let correctly = 'false';
            // CHECK IF isOnlyModerators IS SET OR YOU HAVE TO FIGURE HOW TO SET IT OUT
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
            // When the form gets displayed, allow webview to be clickable, since form would prevent click at this point
            // And there is no (afaik) Close event for forms
        };


        const createCategory = async (values: Record<string, string>) => {
            const retryLimit = 1;

            for (let attempt = 1; attempt <= retryLimit; attempt++) {
                try {
                    // Words composed of letters and spaces, separated by commas
                    const regexWords = /^([a-zA-Z]+(?: [a-zA-Z]+)*)(?:,([a-zA-Z]+(?: [a-zA-Z]+)*))*$/;
                    const regexTitle = /^[a-zA-Z0-9-_ ]{1,16}$/;

                    const titleCorrect = regexTitle.test(values.title);

                    const wordsList = values.words.replace(/[\n\r]/g, '').split(',').map(element => element.trim()).filter(element => element != '' && /^[a-zA-Z\s]+$/.test(element) && element.length <= 12);

                    const words = wordsList.join(',').toUpperCase();
                    const wordsRegexCorrect = regexWords.test(words);

                    const wordsCorrect = wordsRegexCorrect && wordsList.length >= 10 && wordsList.length <= 100;


                    if (wordsCorrect && titleCorrect) {
                        // On Submit Store in Redis as a hash
                        const currentCode = await context.redis.get('latestCategoryCode');
                        if (currentCode == undefined) {
                            continue;
                        }
                        const newCode = getNextCode(currentCode);
                        setLatestCategoryCode(newCode);

                        let cUserInfo = await context.redis.hGet('userIDs', userID) ?? '';
                        if (cUserInfo == '') {
                            continue;
                        }
                        let newInfo = cUserInfo.includes(':c:') ? ':' + newCode : ':c:' + newCode;
                        const hIndex = cUserInfo.indexOf(':h:');
                        newInfo = hIndex != -1
                            ? cUserInfo.slice(0, hIndex) + newInfo + cUserInfo.slice(hIndex)
                            : cUserInfo + newInfo;

                        const txn = await context.redis.watch('latestCategoryCode');

                        const post = await context.reddit.submitPost({
                            title: 'Play ' + values.title + ' category',
                            subredditName: context.subredditName ?? '',
                            preview: (
                                <vstack height="100%" width="100%" alignment="middle center">
                                    <text size="large">Loading ...</text>
                                </vstack>
                            ),
                        });

                        await txn.multi();
                        await txn.hSet('postCategories', { [post.id]: newCode + ':' + userID });
                        await txn.set('latestCategoryCode', newCode);
                        await txn.hSet('usersCategories', {
                            [newCode]: username + ":" + values.title + ":0:0:::" + post.id
                        });
                        await txn.hSet('categoriesWords', {
                            [newCode]: words
                        });
                        await txn.hSet('userIDs', {
                            [userID]: newInfo
                        });
                        await txn.exec();


                        if (post != null) {
                            const postApproved = await context.reddit.approve(post.id);
                        }

                        context.ui.showToast({
                            text: 'Post created!',
                            appearance: 'success'
                        });

                        setFormInputs({ title: '', words: '' });
                        postMessage({
                            type: 'formCorrect',
                            data: {
                                categoryTitle: values.title
                            },
                        });
                    }
                    else {
                        let toastMessage = '';
                        if (!wordsCorrect && !titleCorrect) {
                            toastMessage = 'Both fields have been incorrectly submitted';
                        }
                        else if (!wordsCorrect) { toastMessage = 'Words field has been incorrectly submitted'; }
                        else if (!titleCorrect) {
                            toastMessage = 'Title field has been incorrectly submitted';
                        }
                        context.ui.showToast({
                            text: toastMessage,
                            appearance: 'neutral'
                        });

                        context.ui.showForm(myForm, { title: values.title, words: values.words });
                        /*
                        postMessage({
                            type: 'formIncorrect',
                            data: {
                                wordsCorrect: wordsCorrect,
                                titleCorrect: titleCorrect
                            },
                        });*/
                    }
                    break;
                }
                catch (error) {
                    console.error(`Attempt ${attempt} failed: ${error}`);
                    if (attempt == retryLimit) {
                        //Using form correct message to send information on error
                        postMessage({
                            type: 'formCorrect',
                            data: {
                                categoryTitle: ''
                            },
                        });
                        console.error(`Exceeded retry limit. Could not complete operation for creating category.`);
                        throw error;
                    }
                }
            }
        }

        const getNextCode = (current: string) => {
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

        const deleteCategory = async (categoryCode: string) => {
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
        };

        const deleteAllUserData = async () => {
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
                                //  postCategories.push(postID);

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
                                const [creator, title, plays, , , , postID] = categoryData.split(':');
                                highScoreUpdates[categoryCode] = `${creator}:${title}:${plays}:0:::${postID}`;
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
        };

        // Show webview after listing categories
        const onShowWebview = () => {
            if (!isItPeriodicRemoval) {
                mount();
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


        // Render the custom post type
        return (
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

                {!isItPeriodicRemoval && < zstack grow={!webviewVisible} alignment="center middle" width="100%" height={webviewVisible ? '0%' : '100%'}>
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
                    {typeOfPost == 0 && < vstack
                        grow={!webviewVisible}
                        height={webviewVisible ? '0%' : '100%'}
                        alignment="middle center"
                    >
                        <button icon='play' appearance="primary" onPress={onShowWebview}>ENTER</button>
                    </vstack>}
                    {typeOfPost == 1 && < vstack
                        grow={!webviewVisible}
                        height={webviewVisible ? '0%' : '100%'}
                        alignment="middle center"
                    >
                        <spacer />
                        < text size="xxlarge" weight="bold" color='#f2fffd' outline='thin'>
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
            </vstack >
        );
    },
});




Devvit.addTrigger({
    event: 'PostDelete',
    onEvent: async (event, context) => {
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
                            const [, , , , , highScoreUserID,] =
                                currentCategoryInfo.split(':');

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
    },
});


Devvit.addSchedulerJob({
    name: 'removeUserDataPeriodically',
    onRun: async (event, context) => {
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
                                return;
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
                            console.log(updatedCategoriesList);
                            console.log(cCategories);
                            console.log(iuser);
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
    },
});

Devvit.addSchedulerJob({
    name: 'initialPost',
    onRun: async (event, context) => {
        const post = await context.reddit.submitPost({
            title: 'Word Trail Game',
            subredditName: context.subredditName ?? '',
            preview: (
                <vstack height="100%" width="100%" alignment="middle center">
                    <text size="large">Loading ...</text>
                </vstack>
            ),
        });
        await context.reddit.approve(post.id);
        await post.sticky();

        await context.redis.set('mainPostID', post.id);

        const periodicRemoval = await context.scheduler.runJob({
            name: 'removeUserDataPeriodically',
            cron: '* * 20 * *',
        });

        await context.redis.set('periodicRemoval', periodicRemoval);

        const jobs = await context.scheduler.listJobs();
        console.log('Scheduled jobs:', jobs);
    },
});

Devvit.addTrigger({
    event: 'AppInstall',
    onEvent: async (_, context) => {
        try {
            // Create Post upon Install and pin it
            const secondsFive = new Date(Date.now() + 5000);
            await context.scheduler.runJob({
                name: 'initialPost',
                data: {
                },
                runAt: secondsFive,
            });
        } catch (e) {
            console.log('Error during app installation:', e);
            throw e;
        }
    },
});

// FOR TESTING PURPOSES
/*Devvit.addTrigger({
    event: 'CommentCreate',
    onEvent: async (event, context) => {
        try {
            console.log(event.comment?.body);
            // Setup daily deletion for deletion policy
            const jobId = await context.scheduler.runJob({
                name: 'removeUserDataPeriodically',
                cron: '10 * * * *',
            });
        } catch (e) {
            console.log('Error during app installation:', e);
            throw e;
        }
    },
});*/

export default Devvit;

// TO BE ADDED:

// ADD POST DELETION TRIGGER AND DEPENDING IF IT'S MAIN POST OR SOME OTHER HANDLE ACCORDINGLY