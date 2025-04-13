# WORD TRAIL

Play different categories created by users from subreddit or from moderators (which can be adjusted in settings) by guessing words from particles and trails.

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
* Infinite scrolling
* Time of when category was created

### Category Creation
* Users can create custom word lists (10-100 words)
* Moderator-only creation option for community management
* Form validation with automatic resubmission on errors
* Personal category limit of 10 per user (unlimited for moderators-only case)

### User Settings
* Manage created categories with individual deletion
* Account data removal option for privacy (removing high scores, categories etc.)

### Data Management
* Monthly cleanup removes data from deleted Reddit accounts
* Categories persist with `[deleted]` attribution when user accounts are removed
* User data can be removed on request while preserving categories

## Maintenance

The application performs automatic maintenance on the 20th of each month during which:
* Deleted Reddit users are identified and processed
* Attribution for created categories is anonymized
* High scores are preserved with `[deleted]` attribution
* Associated user data is removed from internal databases

During the maintenance window (first 5 minutes of the 20th), a maintenance message is displayed to users.