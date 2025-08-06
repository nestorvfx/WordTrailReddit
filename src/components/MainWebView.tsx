import {
  Devvit,
  useState,
  useAsync,
  useForm,
  useInterval,
  useWebView,
} from "@devvit/public-api";
import { WebViewMessage } from "../types.js";
import {
  sendCategories,
  sendWords,
  updateCategoryInfo,
  deleteCategory,
  deleteAllUserData,
} from "../handlers/categoryHandlers.js";
import { sendUserData, createCategory } from "../handlers/userHandlers.js";
import { LoadingPreview } from "./LoadingPreview.js";

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
      return -(60 - minute + 0.1); // Minutes until maintenance
    }

    return day < 20 ? -1000 : 1000; // Far outside the maintenance window
  };

  const [diffInMinutes, setDiffInMinutes] = useState(isInMaintenanceWindow());
  const [isItPeriodicRemoval, setIsItPeriodicRemoval] = useState(false);

  const periodCheck = () => {
    // Check if we're currently in maintenance window (first 5 minutes of 20th)
    if (0 <= diffInMinutes && diffInMinutes <= 5) {
      setIsItPeriodicRemoval(true);
    }
    // Check if we're approaching maintenance (negative minutes)
    else if (diffInMinutes < 0 && diffInMinutes > -100) {
      // Only schedule if reasonably close
      useInterval(
        () => {
          setIsItPeriodicRemoval(true);
        },
        Math.max(Math.abs(diffInMinutes) * 60000 + 50, 1000),
      ).start();
    }
  };

  periodCheck();

  // Convert blocking useState to non-blocking useAsync for user data
  const {
    data: user,
    loading: userLoading,
    error: userError,
  } = useAsync(async () => {
    const retryLimit = 1;

    for (let attempt = 1; attempt <= retryLimit; attempt++) {
      try {
        const currUser = await context.reddit.getCurrentUser();
        if (currUser == undefined) {
          continue;
        }
        const moderatorPermissions =
          await currUser.getModPermissionsForSubreddit(
            context.subredditName ?? "",
          );
        if (moderatorPermissions == undefined) {
          continue;
        }
        return `${currUser?.username}:${moderatorPermissions.length > 0 ? "y" : "n"}`;
      } catch (error) {
        // Check if it's the special ServerCallRequired error
        if (error && typeof error === 'object' && 'message' in error && error.message=== 'ServerCallRequired') {
          throw error; // Re-throw this specific error
        }
        
        console.error(`Attempt ${attempt} failed: ${error}`);
        if (attempt == retryLimit) {
          console.error(
            `Exceeded retry limit. Could not complete operation for sending category info.`,
          );
          return "[guestUser]:n";
        }
      }
    }
    return "[guestUser]:n";
  });

  // Handle user loading state and derive dependent values
  if (userLoading) {
    return <LoadingPreview />;
  }

  if (userError) {
    console.error("User authentication error:", userError);
  }

  const username = user?.split(":")[0] || "[guestUser]";
  const userID = context.userId ?? "";
  const isUserModerator = user?.split(":")[1] === "y";

  // Convert settings fetch to useAsync
  const { data: isOnlyModerators, loading: settingsLoading } = useAsync(
    async () => {
      return (await context.settings.get("moderator-categories")) ?? false;
    },
  );

  if (settingsLoading) {
    return <LoadingPreview />;
  }

  const userAllowedToCreate =
    (isOnlyModerators && isUserModerator) || !isOnlyModerators;

  // Convert current user info to useAsync with dependency on userID and username
  const {
    data: currentUserInfo,
    loading: userInfoLoading,
    error: userInfoError,
  } = useAsync(
    async () => {
      const retryLimit = 1;
      for (let attempt = 1; attempt <= retryLimit; attempt++) {
        try {
          const value = await context.redis.hGet("userIDs", userID);
          if (value == undefined || value == null) {
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
              `Exceeded retry limit. Could not complete operation for sending category info.`,
            );
            return "";
          }
        }
      }
      return "";
    },
    { depends: [userID, username] },
  );

  if (userInfoLoading) {
    return <LoadingPreview />;
  }

  // Convert latestCategoryCode to useAsync
  const { data: latestCategoryCode, loading: categoryCodeLoading } = useAsync(
    async () => {
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
              `Exceeded retry limit. Could not complete operation for sending category info.`,
            );
            return "";
          }
        }
      }
      return "";
    },
  );

  if (categoryCodeLoading) {
    return <LoadingPreview />;
  }

  const [webviewVisible, setWebviewVisible] = useState(false);
  const [formInputs, setFormInputs] = useState({ title: "", words: "" });

  // Convert typeOfPost to useAsync with dependencies
  const { data: typeOfPost, loading: typeOfPostLoading } = useAsync(
    async () => {
      const mainPostID = (await context.redis.get("mainPostID")) ?? "";
      const postCategoryData = await context.redis.hGet(
        "postCategories",
        context.postId ?? "",
      );

      if (context.postId === mainPostID) {
        return 0;
      } else if (postCategoryData) {
        return 1;
      } else {
        return 2;
      }
    },
    { depends: [context.postId] },
  );

  if (typeOfPostLoading) {
    return <LoadingPreview />;
  }

  // Convert postCategory to useAsync with dependencies
  const { data: postCategory, loading: postCategoryLoading } = useAsync(
    async () => {
      if (typeOfPost === 0) {
        return "";
      } else if (typeOfPost === 1) {
        const postCategoryData =
          (await context.redis.hGet("postCategories", context.postId ?? "")) ??
          "";
        const [categoryCode] = postCategoryData.split(":");

        if (categoryCode) {
          const [categoryInfo, categoryWords] = await Promise.all([
            context.redis.hGet("usersCategories", categoryCode),
            context.redis.hGet("categoriesWords", categoryCode),
          ]);

          if (categoryInfo && categoryWords) {
            return categoryCode + ":" + categoryInfo + ":" + categoryWords;
          }
        }
        return "";
      } else {
        return "";
      }
    },
    { depends: [typeOfPost, context.postId] },
  );

  if (postCategoryLoading) {
    return <LoadingPreview />;
  }

  const { mount, postMessage } = useWebView({
    url: "page.html",

    onMessage: async (message: WebViewMessage) => {
      setDiffInMinutes(isInMaintenanceWindow());
      setIsItPeriodicRemoval(0 <= diffInMinutes && diffInMinutes <= 5);
      if (!isItPeriodicRemoval) {
        switch (message.type) {
          case "updateCategories":
            await sendCategories(
              context,
              message.data.cursor,
              message.data.sortMethod || "time",
              postMessage,
              message.data.reversed || false,
            );
            break;
          case "requestUserData":
            await sendUserData(context, userID, postMessage);
            break;
          case "startForm":
            await startForm();
            break;
          case "wordsRequest":
            await sendWords(context, message.data.categoryCode, postMessage);
            break;
          case "updateCategoryInfo":
            await updateCategoryInfo(
              context,
              message.data,
              postMessage,
              username,
              userID,
            );
            break;
          case "deleteCategory":
            await deleteCategory(
              context,
              message.data.categoryCode,
              userID,
              postMessage,
            );
            break;
          case "deleteAllUserData":
            await deleteAllUserData(context, userID, postMessage);
            break;
          case "webViewStarted":
            webViewStarted();
            break;
          default:
            throw new Error(`Unknown message type: ${message.type}`);
        }
      }
    },
    onUnmount: () => {
      setWebviewVisible(false);
      setFormInputs({ title: "", words: "" });
    },
  });

  const myForm = useForm(
    (data) => {
      return {
        title: "Create Category",
        description: "Post will be created for each category",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Category title (e.g. Popular TV Shows)",
            helpText:
              "How will category be displayed to other users. Using up to 16 from a-Z 0-9 - _ and space characters",
            required: true,
            defaultValue: data?.title || "", // Use previous value if available
          },
          {
            type: "paragraph",
            name: "words",
            label: "Words (e.g. word, trail, game, example)",
            helpText:
              "Write at least 10 (and at most 100) entries separated with (,) Each with no more than 12 characters (a-Z and space)",
            required: true,
            defaultValue: data?.words || "", // Use previous value if available
          },
        ],
      } as const;
    },
    async (event) => {
      const success = await createCategory(
        context,
        userID,
        event.title,
        event.words,
        postMessage,
      );

      if (!success) {
        context.ui.showForm(myForm, {
          title: event.title,
          words: event.words,
        });
      }
    },
  );

  const startForm = async () => {
    let correctly = "false";
    let maxCategories = isOnlyModerators && isUserModerator ? 999 : 10;
    if (userAllowedToCreate) {
      const userInfoArray = (
        (await context.redis.hGet("userIDs", userID)) ?? ""
      ).split(":");
      if (userInfoArray && userInfoArray[0] != "") {
        if (
          userInfoArray.slice(
            userInfoArray.indexOf("c") + 1,
            userInfoArray.indexOf("h") == -1
              ? userInfoArray.length
              : userInfoArray.indexOf("h"),
          ).length < maxCategories
        ) {
          correctly = "true";
          context.ui.showForm(myForm, { title: "", words: "" });
        } else {
          correctly = "exceeded";
        }
      } else {
        correctly = "false";
      }
    }
    postMessage({
      type: "formOpened",
      data: { correctly: correctly },
    });
  };

  const onShowWebview = () => {
    if (!isItPeriodicRemoval) {
      mount();
      setWebviewVisible(true);
    }
  };

  const webViewStarted = () => {
    postMessage({
      type: "initialData",
      data: {
        username: username,
        userID: userID,
        userAllowedToCreate: userAllowedToCreate,
        postType:
          typeOfPost == 0
            ? "mainPost"
            : typeOfPost == 1
              ? "categoryPost:" + postCategory
              : "",
      },
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    if (!timestamp || isNaN(parseInt(timestamp))) {
      return "";
    }

    try {
      const now = new Date();

      const diffMs = now.getTime() - parseInt(timestamp) * 1000;

      // Less than a minute ago
      if (diffMs < 60000) {
        return "now";
      }

      // Less than an hour ago
      if (diffMs < 3600000) {
        const diffMinutes = Math.floor(diffMs / 60000);
        return `${diffMinutes}min`;
      }

      // Less than a day
      if (diffMs < 86400000) {
        const diffHours = Math.floor(diffMs / 3600000);
        return `${diffHours}h`;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "Today";
      } else if (diffDays === 1) {
        return "1d";
      } else if (diffDays < 7) {
        return `${diffDays}d`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}w`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months}mo`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years}y`;
      }
    } catch (e) {
      // Check if it's the special ServerCallRequired error
      if (e && typeof e === 'object' && 'message' in e && e.message === 'ServerCallRequired') {
        throw e; // Re-throw this specific error
      }
      
      console.error("Error formatting timestamp:", e);
      return "";
    }
  };

  const screenWidth = context.dimensions?.width;
  const screenHeight = context.dimensions?.height;
  const smallText = screenWidth / screenHeight < 0.65 ? "xsmall" : "medium";
  const textSize = screenWidth / screenHeight < 0.8 ? smallText : "xlarge";
  const textTimeSize = screenWidth / screenHeight < 0.8 ? "xsmall" : "large";
  const textWeight = screenWidth / screenHeight < 0.8 ? "regular" : "bold";
  const hsTextSize = screenWidth / screenHeight < 0.8 ? "medium" : "xlarge";
  const additionalScaling = screenWidth / screenHeight < 0.65 ? 0.7 : 1;

  return (
    <blocks height="tall">
      <vstack
        backgroundColor="#EC0B43"
        grow
        padding="small"
        width="100%"
        height="100%"
      >
        {isItPeriodicRemoval && (
          <vstack grow={true} height={"100%"} alignment="middle center">
            <text size="xlarge" weight="bold">
              Word Trail
            </text>
            <spacer />
            <vstack alignment="middle center">
              <text size="medium" weight="bold">
                Maintenance in progress. Try again
              </text>
              <text size="medium" weight="bold">
                in a few minutes.
              </text>
            </vstack>
          </vstack>
        )}

        {!isItPeriodicRemoval && (
          <zstack
            grow={!webviewVisible}
            alignment="center middle"
            width="100%"
            height={webviewVisible ? "0%" : "100%"}
          >
            {typeOfPost == 0 && (
              <vstack height="50%" width="100%">
                <image
                  url="Word Trail.gif"
                  imageWidth={1104}
                  imageHeight={274}
                  grow={!webviewVisible}
                  height="180%"
                  width="100%"
                  resizeMode="fit"
                  description="background image"
                />
                <vstack
                  grow={!webviewVisible}
                  height={webviewVisible ? "0%" : "100%"}
                  alignment="middle center"
                >
                  <image
                    url="Enter.png"
                    height="75%"
                    width="22%"
                    imageWidth={700}
                    imageHeight={256}
                    resizeMode="scale-down"
                    onPress={onShowWebview}
                  />
                </vstack>
              </vstack>
            )}
            {typeOfPost == 1 && (
              <zstack
                grow={!webviewVisible}
                height={webviewVisible ? "0%" : "100%"}
                width="100%"
                alignment="middle center"
                padding="small"
                gap="small"
              >
                <vstack height={"100%"} width="100%" alignment="middle center">
                  <image
                    url="Word Trail.gif"
                    imageWidth={1104}
                    imageHeight={274}
                    width="100%"
                    resizeMode="fit"
                    description="background image"
                  />
                  <spacer height="60%" />
                </vstack>

                <zstack width="100%" height="20%" alignment="middle center">
                  <image
                    url="category.png"
                    imageWidth={830}
                    imageHeight={152}
                    height={
                      ((screenWidth / screenHeight) * 85 +
                        "%") as Devvit.Blocks.SizeString
                    }
                    resizeMode="fit"
                    description="background image"
                  />
                  <vstack
                    width="100%"
                    height="100%"
                    grow={true}
                    alignment="middle center"
                  >
                    <spacer
                      height={
                        ((screenWidth / screenHeight) * 31 +
                          "%") as Devvit.Blocks.SizeString
                      }
                    />

                    <zstack width="100%" alignment="start">
                      <hstack width="100%" alignment="start">
                        <spacer
                          width={
                            (7 * additionalScaling +
                              "%") as Devvit.Blocks.SizeString
                          }
                        />
                        <text
                          size={textSize}
                          color="#000000"
                          weight={textWeight}
                        >
                          {postCategory?.split(":")[2] || "Unknown"}
                        </text>
                      </hstack>
                      <hstack width="100%" alignment="middle start">
                        <spacer
                          width={(34 + "%") as Devvit.Blocks.SizeString}
                        />
                        {postCategory &&
                          parseInt(postCategory.split(":")[4]) > 0 && (
                            <text
                              size={textSize}
                              color="#000000"
                              weight={textWeight}
                            >
                              {postCategory.split(":")[1]}
                            </text>
                          )}
                      </hstack>
                      <hstack width="100%" alignment="middle start">
                        <spacer width="63.5%" />
                        <text
                          size={textSize}
                          color="#000000"
                          weight={textWeight}
                        >
                          {postCategory?.split(":")[3] || "0"}
                        </text>
                      </hstack>
                      <hstack width="100%" alignment="middle start">
                        <spacer width="77%" />
                        <text
                          size={textSize}
                          color="#000000"
                          weight={textWeight}
                        >
                          {postCategory?.split(":")[4] || "0"}
                        </text>
                      </hstack>
                      <hstack width="100%" alignment="middle start">
                        <spacer width="87.5%" />
                        <text
                          size={textTimeSize}
                          color="#bb7900"
                          weight={textWeight}
                        >
                          {formatRelativeTime(
                            postCategory?.split(":")[8] || "0",
                          )}
                        </text>
                      </hstack>
                    </zstack>
                  </vstack>
                </zstack>

                <vstack width="100%" height="100%" alignment="middle center">
                  <spacer height="32%" />
                  {postCategory && parseInt(postCategory.split(":")[4]) > 0 && (
                    <hstack
                      height={
                        ((screenWidth / screenHeight) * 6 +
                          "%") as Devvit.Blocks.SizeString
                      }
                      alignment="middle center"
                      cornerRadius="medium"
                    >
                      <text size={hsTextSize} color="#FFFFFF" weight="regular">
                        High Score by
                      </text>
                      <spacer width="2%" />
                      <text size={hsTextSize} color="#FFFFFF" weight="bold">
                        {postCategory.split(":")[5]}
                      </text>
                    </hstack>
                  )}
                </vstack>

                <vstack height={"100%"} width="100%" alignment="middle center">
                  <spacer height="60%" />
                  <image
                    url="Play.png"
                    height="10%"
                    width="20%"
                    imageWidth={700}
                    imageHeight={256}
                    resizeMode="scale-down"
                    onPress={onShowWebview}
                  />
                </vstack>
              </zstack>
            )}
          </zstack>
        )}
      </vstack>
    </blocks>
  );
};
