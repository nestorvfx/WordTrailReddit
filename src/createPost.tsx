import { Devvit, SettingScope } from "@devvit/public-api";
import { LoadingPreview } from "./components/LoadingPreview.js";

Devvit.addSettings([
  {
    type: "boolean",
    name: "moderator-categories",
    label: "Only moderators can create categories",
    scope: SettingScope.Installation,
  },
]);

// Configure Devvit's plugins
Devvit.configure({
  redditAPI: true,
});

// Adds a new menu item to the subreddit allowing to create a new post
Devvit.addMenuItem({
  label: "Word Trail Game",
  location: "subreddit",
  onPress: async (_event, context) => {
    const mainPostID = await context.redis.get("mainPostID");
    if (mainPostID == "") {
      const { reddit, ui } = context;
      const subreddit = await reddit.getCurrentSubreddit();
      const post = await reddit.submitPost({
        title: "Word Trail Game",
        subredditName: subreddit.name,
        // The preview appears while the post loads
        preview: LoadingPreview(),
      });
      await context.redis.set("mainPostID", post.id);
      await context.reddit.approve(post.id);
      try {
        await post.sticky();
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

        console.error(`Failed to sticky post: ${error}`);
        // Continue execution even if stickying fails
      }
      ui.showToast({ text: "Created post!" });
      ui.navigateTo(post);
    } else {
      context.ui.showToast({ text: "There already exists main game post." });
    }
  },
});
