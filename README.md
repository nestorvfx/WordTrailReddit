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

## Project and Database Structure

### Project Structure
* **Redis**: Used for data storage with 4 main hashes.
* **WebView**: Utilized for game visualization.
* **Three.js**: Implements particle system visualization.
* **Custom Post Types and Menu Items**: Enables integration with Reddit for category creation and gameplay.

### Database Structure (Redis)

#### User Data Storage (`userIDs` hash)
- **Key**: `userID`
- **Value**: `username:c:categoryCode1:categoryCode2...:h:categoryCodeH1:categoryCodeH2`
  - Between `c` and `h` are categories created by user
  - After `h` are categories where user holds high score

#### Latest Category Code (`latestCategoryCode` string)
- Stores the most recently generated category code
- Used for referencing and generating new category codes

#### Categories Storage (`usersCategories` hash) 
- **Key**: `categoryCode`
- **Value**: `creator:categoryTitle:plays:highScore:highScoreUserName:highScoreUserID:postID`
  - creator: Username who created category
  - categoryTitle: Display name for category
  - plays: Number of times played
  - highScore: Current high score
  - highScoreUserName: Username holding high score
  - highScoreUserID: UserID holding high score
  - postID: Associated Reddit post ID

#### Words Storage (`categoriesWords` hash)
- **Key**: `categoryCode` 
- **Value**: Comma-separated words for the category

#### Post Categories (`postCategories` hash)
- **Key**: `postID`
- **Value**: `categoryCode:authorID`

### Data Operations
- **Category Creation**: Generates new category code, stores words and metadata
- **Game Play**: Updates play count and high scores
- **Data Cleanup**: Monthly process (20th) to handle deleted users:
  - Retains categories but marks creator as '[deleted]'
  - Updates high scores to show '[deleted]'
  - Removes user data from system

### Security Features
- Moderator-only category creation (optional)
- User data cleanup automation
- Post verification and approval system