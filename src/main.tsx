import './createPost.js';
import { Devvit } from '@devvit/public-api';
import { MainWebView } from './components/MainWebView.js';
import { handlePostDelete, handleAppInstall } from './handlers/eventHandlers.js';
import { initialPost, removeUserDataPeriodically, cleanupTrendingCategories } from './handlers/schedulerHandlers.js';

Devvit.configure({
    redditAPI: true,
});

Devvit.addCustomPostType({
    name: 'Main WebView',
    height: 'tall',
    render: MainWebView,
});

// Event handlers
Devvit.addTrigger({
    event: 'PostDelete',
    onEvent: handlePostDelete,
});

Devvit.addTrigger({
    event: 'AppInstall',
    onEvent: handleAppInstall,
});

// Scheduler jobs
Devvit.addSchedulerJob({
    name: 'initialPost',
    onRun: initialPost,
});

Devvit.addSchedulerJob({
    name: 'removeUserDataPeriodically',
    onRun: removeUserDataPeriodically,
});

Devvit.addSchedulerJob({
    name: 'cleanupTrendingCategories',
    onRun: cleanupTrendingCategories,
});

export default Devvit;