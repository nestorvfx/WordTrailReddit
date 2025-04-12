# WORD TRAIL

Word Trail is an interactive word-guessing game built on Reddit's Devvit platform where players try to guess words represented by animated particles and trails.

## Gameplay

* **60-second timer** with countdown display
* **-8 seconds** from timer for each correct guess (timer won't go below 0:00)
* Dynamic particle trails that evolve over time and reset on correct guesses
* Game ends when all words are correctly guessed, on incorrect guess, or when timer expires
* **High scores** tracked per category with creator recognition
* **Play counts** showing category popularity

## Key Features

### Categories System
* Browse user-created categories with search functionality
* Sort by Newest, Most Played, or Highest Score
* Infinite scrolling with efficient data pagination
* Real-time relative timestamps (now, 5min, 2h, 3d, etc.)

### Category Creation
* Users can create custom word lists (10-100 words)
* Moderator-only creation option for community management
* Form validation with automatic resubmission on errors
* Personal category limit of 10 per user (unlimited for moderators)

### User Settings
* Manage created categories with individual deletion
* Account data removal option for privacy
* High score and play count tracking

## Technical Design

### Architecture Overview
Word Trail uses a modern client-server architecture:

* **Frontend**: WebView with HTML5/CSS3/JavaScript and Three.js for particle animations
* **Backend**: TypeScript with Devvit Reddit integration and Redis for persistence
* **Communication**: Message-based protocol between frontend and backend components

### Database Structure

#### Global Keys
* `mainPostID`: ID of the main game post
* `latestCategoryCode`: Counter for generating unique category codes
* `periodicRemoval`: Scheduled job reference for monthly cleanup

#### Hash Tables
* `userIDs`: Maps Reddit user IDs to their data
  * Format: `username:c:categoryCode1:categoryCode2...:h:categoryCodeH1:categoryCodeH2`
  * Categories created by user are between `:c:` and `:h:`
  * Categories where user holds high score are after `:h:`
   
* `usersCategories`: Stores category metadata
  * Key: `categoryCode`
  * Value: `creator:categoryTitle:plays:highScore:highScoreUserName:highScoreUserID:postID:timestamp`

* `categoriesWords`: Stores the actual words for categories
  * Key: `categoryCode`
  * Value: Comma-separated list of uppercase words

* `postCategories`: Links Reddit posts to categories
  * Key: `postID`
  * Value: `categoryCode:authorID`

#### Sorted Sets
* `categoriesByTime`: Categories sorted by creation timestamp (newest first)
* `categoriesByPlays`: Categories sorted by number of plays (most popular first)
* `categoriesByScore`: Categories sorted by high score (highest first)

### Performance Optimizations
* **Debounced scroll events** prevent redundant category requests
* **Request tracking** avoids duplicate API calls with same parameters
* **Redis sorted sets** enable efficient pagination without loading all data
* **Transaction-based updates** prevent race conditions

### Data Management
* Monthly cleanup removes data from deleted Reddit accounts
* Categories persist with `[deleted]` attribution when user accounts are removed
* User data can be removed on request while preserving categories

### Security Considerations
* Data tied to Reddit IDs rather than usernames for consistency
* Validation for all user inputs with clear error messages
* Rate limiting through request tracking

## Maintenance

The application performs automatic maintenance on the 20th of each month during which:
* Deleted Reddit users are identified and processed
* Attribution for created categories is anonymized
* High scores are preserved with `[deleted]` attribution
* Associated user data is removed from internal databases

During the maintenance window (first 5 minutes of the 20th), a maintenance message is displayed to users.

