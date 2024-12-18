import './createPost.js';

import { Devvit, useState, useForm } from '@devvit/public-api';

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
    | {
        type: 'initialData';
        data: {
            username: string,
            usersCategories: string
        };
    }
    | {
        type: 'sendCategories';
        data: {
            usersCategories: string
        };
    }
    | {
        type: 'updateCategories';
        data: {
        };
    }
    | {
        type: 'startForm';
        data: {};
    }
    | {
        type: 'formOpened';
        data: {
            correctly: boolean
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
            newStats: string
        };
    };

Devvit.configure({
    redditAPI: true,
    redis: true,
});

// Add a custom post type to Devvit
Devvit.addCustomPostType({
    name: 'Webview Example',
    height: 'tall',
    render: (context) => {
        // Load username with `useAsync` hook
        const [user] = useState(async () => {
            const currUser = await context.reddit.getCurrentUser();
            return currUser?.id == undefined ? 'anon' : `${currUser?.id}:${currUser?.username}`;
        });

        const [username] = useState(() => { return user.split(':')[1] });
        const [userId] = useState(() => { return user.split(':')[0] });

        const [latestCategoryCode, setLatestCategoryCode] = useState(async () => {
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
                return '';
            }
        });

        const [currentCategoryCode, setCurrentCategoryCode] = useState('');
        const [currentCategoryTitle, setCurrentCategoryTitle] = useState('');

        // Create a reactive state for web view visibility
        const [webviewVisible, setWebviewVisible] = useState(false);

        // When the web view invokes `window.parent.postMessage` this function is called
        const onMessage = async (msg: WebViewMessage) => {
            switch (msg.type) {
                case 'initialData':
                case 'updateCategories':
                    await sendCategories('sendCategories');
                    break;
                case 'startForm':
                    startForm();
                    break;
                case 'wordsRequest':
                    await sendWords(msg.data.categoryCode);
                    break;
                case 'updateCategoryInfo':
                    await updateCategoryInfo(msg.data);
                    break;
                default:
                    throw new Error(`Unknown message type`);
            }
        };

        const sendCategories = async (messageType: string) => {
            // If there are more users, situations that send larger amounts of potentially data should be handled additionally
            const allCategories = await context.redis.hGetAll('usersCategories');

            // Putting categories into string (could be added filtering filter(element => !element.startsWith(username)) to prevent same user playing their category...)
            let result = Object.entries(allCategories)
                .map(([key, value]) => `${key}:${value}`)
                .join(";");;

            if (messageType == 'sendCategories') {
                context.ui.webView.postMessage('gameWebView', {
                    type: messageType,
                    data: {
                        usersCategories: result
                    },
                });
            } else if (messageType == 'initialData') {
                context.ui.webView.postMessage('gameWebView', {
                    type: messageType,
                    data: {
                        username: username,
                        usersCategories: result
                    },
                });
            }
        };

        const sendWords = async (categoryCode: string) => {
            const categoryWords = (await context.redis.hGet('categoriesWords', categoryCode)) ?? 'error';

            context.ui.webView.postMessage('gameWebView', {
                type: 'sendCategoryWords',
                data: {
                    words: categoryWords
                },
            });
        };

        const updateCategoryInfo = async (categoryInfo: Record<string, string>) => {
            const txn = await context.redis.watch('latestCategoryCode');

            await txn.multi();
            await txn.hSet('usersCategories', {
                [categoryInfo.categoryCode]: categoryInfo.newStats
            });
            if (categoryInfo.newStats.endsWith(':' + username)) {
                await txn.hSet(userId, {
                    ['h' + latestCategoryCode]: 'y'
                });
            }
            await txn.exec();
        };

        // Form for submitting words
        const myForm = useForm(
            {
                title: 'Create Category',
                fields: [
                    {
                        type: 'string',
                        name: 'title',
                        label: 'Category title (e.g. Popular TV Shows)',
                        helpText: "How will category be displayed to other users. Using up to 32 from a-Z 0-9 - _ and space characters",
                        required: true,
                    },
                    {
                        type: 'paragraph',
                        name: 'words',
                        label: 'Words (e.g. word, trail, game, example)',
                        helpText: "Write at least 10 (and at most 100) entries separated with (,) Each with no more than 12 characters (a-Z and space)",
                        required: true,
                    },
                ],
            },
            async (values) => {
                // Words composed of letters and spaces, separated by commas
                const regexWords = /^([a-zA-Z]+(?: [a-zA-Z]+)*)(?:,([a-zA-Z]+(?: [a-zA-Z]+)*))*$/;
                const regexTitle = /^[a-zA-Z0-9-_ ]{1,32}$/;

                const titleCorrect = regexTitle.test(values.title);

                const wordsList = values.words.replace(/[\n\r]/g, '').split(',').map(element => element.trim()).filter(element => element != '' && /^[a-zA-Z\s]+$/.test(element) && element.length <= 12);

                const words = wordsList.join(',').toUpperCase();
                const wordsRegexCorrect = regexWords.test(words);

                const wordsCorrect = wordsRegexCorrect && wordsList.length >= 10 && wordsList.length <= 100;

                if (wordsCorrect && titleCorrect) {
                    // On Submit Store in Redis as a hash
                    const newCode = getNextCode(latestCategoryCode);
                    setLatestCategoryCode(getNextCode(latestCategoryCode));

                    const txn = await context.redis.watch('latestCategoryCode');

                    await txn.multi();
                    await txn.set('latestCategoryCode', newCode);
                    await txn.hSet('usersCategories', {
                        [newCode]: username + ":" + values.title + ":0:0:"
                    });
                    await txn.hSet('categoriesWords', {
                        [newCode]: words
                    });
                    await txn.hSet(userId, {
                        ['c' + newCode]: 'y'
                    });
                    await txn.exec();


                    context.ui.webView.postMessage('gameWebView', {
                        type: 'formCorrect',
                        data: {
                            categoryTitle: values.title
                        },
                    });
                } else {
                    context.ui.webView.postMessage('gameWebView', {
                        type: 'formIncorrect',
                        data: {
                            wordsCorrect: wordsCorrect,
                            titleCorrect: titleCorrect
                        },
                    });
                }
            }
        );

        const startForm = async () => {
            if (latestCategoryCode == '') {
                setLatestCategoryCode(await context.redis.get('latestCategoryCode') ?? '');
            }

            const correctly = latestCategoryCode != '';
            if (correctly) {
                context.ui.showForm(myForm);
            }

            context.ui.webView.postMessage('gameWebView', {
                type: 'formOpened',
                data: { correctly: correctly },
            });

            // When the form gets displayed, allow webview to be clickable, since form would prevent click at this point
            // And there is no (afaik) Close event for forms
        };

        // Show webview after listing categories
        const onShowWebview = async () => {
            setWebviewVisible(true);

            await sendCategories('initialData');
        };


        const getNextCode = (current: string) => {
            const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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


        // Render the custom post type
        return (
            <vstack grow padding="small">
                <vstack
                    grow={!webviewVisible}
                    height={webviewVisible ? '0%' : '100%'}
                    alignment="middle center"
                >
                    <text size="xlarge" weight="bold">
                        Word Trail
                    </text>
                    <spacer />

                    <button onPress={onShowWebview}>Enter the Game</button>

                </vstack>

                <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'}>
                    <vstack border="thick" borderColor="black" height={webviewVisible ? '100%' : '0%'}>
                        <webview
                            id="gameWebView"
                            url="page.html"
                            onMessage={(msg) => onMessage(msg as WebViewMessage)}
                            grow
                            height={webviewVisible ? '100%' : '0%'}
                        />
                    </vstack>
                </vstack>
            </vstack>
        );
    },
});

Devvit.addSchedulerJob({
    name: 'initialPost',
    onRun: async (event, context) => {
        const subreddit = await context.reddit.getCurrentSubreddit();
        const post = await context.reddit.submitPost({
            title: 'Word Trail Game',
            subredditName: subreddit.name,
            preview: (
                <vstack height="100%" width="100%" alignment="middle center">
                    <text size="large">Loading ...</text>
                </vstack>
            ),
        });
        await post.sticky();
    },
});


Devvit.addTrigger({
    event: 'AppInstall',
    onEvent: async (_, context) => {
        try {
            const second = new Date(Date.now() + 1000);
            await context.scheduler.runJob({
                name: 'initialPost',
                data: {
                },
                runAt: second,
            });
        } catch (e) {
            console.log('Error during app installation:', e);
            throw e;
        }
    },
});

export default Devvit;