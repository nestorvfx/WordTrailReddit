# WORD TRAIL

Guess words from particles and trails, set by other users/moderators in different categories.

### Features
* **60 seconds** timer
* Each **correct guess subtracts 8 seconds** from timer (0:00 being lowest time at any given point)
* Trails increase in length with time and shorten (fully) on correct guess + paths 'change subtly' with time and correct guesses
* When all words are guessed correctly, on incorrect guess or when timer runs out game finishes.
* **High scores** are tracked per category, where only first to reach certain high score is tracked as such.
* Number of times each category has been played is tracked

### Categories creators
When installing the game, moderators can choose whether everyone is allowed to create categories or
moderators want to be in charge of creating them.

### UGC content
Each time category is created, post will be provided for it.
Each time category has been played, commented will be posted within original categories post.


## HOW TO PLAY
On game install Word Trail main post will appear pinned in the respective subreddit (there will also be option
within subreddits Menu to create such post with limit of 1 such post per subreddit).
Within main post there will be 3 buttons:

### Play
Within Play screen, there will be list of categories available for play displayed with following information:
* **Title** - categories title
* **Created By** - username of who created category
* **Played** - how many times has category been played (*Where game is considered played once game play finishes*)
* **HS** - high score in the category

### Create Category
When pressed, form will appear with title and words options, with input requiremnts below each.

### Settings
In this section, users will be presented with all the categories they've created and *Delete Category* button
to remove them (one by one).
In the top right of the section there will be *Remove Data* button, which will allow users
to remove all data stored within Word Trail game (and associated databases) including all the categories created,
posts created alongside those categories and high scores achieved (respective categories will now have HS of 0).


## Data cleanup
20th on each month, every user (by id) that has been removed/is no longer active Reddit user
will have their data removed from Word Trail game in the following manner:
* Categories they created will still stay, but instead of username for creator it will be '[deleted]'
* Similar for high scorer for category, instead of username '[deleted]' will be written.
* And userID/username will be removed from every other part of Word Trail itself/associated database(s)
posts created alongside those categories and high scores achieved (respective categories will now have HS of 0).


## Technical Documentation

### Architecture Overview
Word Trail is built on Reddit's Devvit platform, utilizing a client-server architecture:
- **Backend**: Node.js with TypeScript, leveraging Devvit's APIs for Reddit integration and Redis for data storage
- **Frontend**: HTML5/CSS3/JavaScript web application embedded in a Reddit WebView component

### Database Structure
The application uses Redis for data persistence with the following key structures:

#### Global Keys
- `mainPostID`: ID of the main game post created upon app installation
- `periodicRemoval`: ID of the periodic removal job for user data cleanup
- `latestCategoryCode`: Counter/string value used to generate unique codes for new categories

#### Hash Tables
- `userIDs` (Hash)
   - Key: User's Reddit ID
   - Value: `username:c:categoryCode1:categoryCode2...:h:categoryCodeH1:categoryCodeH2`
     - Between `:c:` and `:h:` are categories created by the user
     - After `:h:` are categories where the user holds the high score
   
- `usersCategories` (Hash)
   - Key: `categoryCode` (unique identifier)
   - Value: `creator:categoryTitle:plays:highScore:highScoreUserName:highScoreUserID:postID:timestamp`
     - Contains metadata about each category including play count, high score info, and creation timestamp

- `categoriesWords` (Hash)
   - Key: `categoryCode`
   - Value: Comma-separated list of words for the category (the actual game content)

- `postCategories` (Hash)
   - Key: `postID` (Reddit post identifier)
   - Value: `categoryCode:authorID`
   - Maps Reddit posts to their corresponding category codes and creators

#### Sorted Sets
- `categoriesByTime` (Sorted Set)
   - Members: Category codes
   - Scores: Unix timestamps of creation
   - Used for sorting categories by newest first

- `categoriesByPlays` (Sorted Set)
   - Members: Category codes
   - Scores: Number of times each category has been played
   - Used for sorting categories by popularity

- `categoriesByScore` (Sorted Set)
   - Members: Category codes
   - Scores: Highest score achieved in the category
   - Used for sorting categories by difficulty/achievement

### Application Flow
1. **Initialization**:
   - App installation triggers `handleAppInstall` and schedules `initialPost` to create a pinned post
   - `removeUserDataPeriodically` job runs monthly (on the 20th) to clean up data from deleted users

2. **Main Interface**:
   - `MainWebView` renders the game interface in a Reddit post
   - WebView loads HTML/CSS/JS from `webroot/` directory
   - Communication between WebView and backend handled via typed message passing

3. **Category Navigation**:
   - Play menu supports infinite scrolling with Redis pagination
   - Categories are loaded in batches of 20 and appended to the existing view
   - Supports sorting by newest, most played, or highest score
   - Search functionality allows filtering categories by title or creator

4. **Game Lifecycle**:
   - User selects category and particles representing words to guess are displayed
   - Correct guesses update scores and modify the timer (-8 seconds per correct guess)
   - Particles increase in complexity over time and reset on correct guesses
   - End of game posts comments to category posts and updates high scores if applicable

5. **Data Management**:
   - Categories creation/deletion handled through backend Redis transactions
   - User data removal (manual or automated) preserves categories but anonymizes creator/high scorer information
   - Redis sorted sets ensure efficient category retrieval, pagination, and sorting

### Security & Performance Considerations
- User data is tied to Reddit IDs and cleaned up for deleted accounts
- Redis transactions prevent race conditions when updating categories
- WebView messages are typed to ensure proper data structure validation
- Optimized category loading with append-on-scroll behavior improves performance
- Redis sorted sets enable efficient pagination and sorting without loading all categories
- Monthly cleanup job ensures the database doesn't accumulate data from deleted users

