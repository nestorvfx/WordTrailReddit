import { GAME_LENGTH } from './constants.js';
import { clamp } from './utils.js';

/**
 * Class that manages the game state
 */
export class GameState {
    constructor() {
        // Game state
        this.gameStarted = false;
        this.gameFinished = false;
        this.particlesAreSetup = false;
        
        // Category data
        this.categoryCode = '';
        this.createdBy = '';
        this.categoryTitle = '';
        this.categoryNumOfPlays = '';
        this.categoryHighScore = '';
        this.categoryHSByUsername = '';
        this.categoryHSByID = '';
        this.categoryPostID = '';
        this.wordsString = '';
        
        // User data
        this.username = '';
        this.userID = '';
        this.userAllowedToCreate = false;
        
        // Game data
        this.currentWords = ['REDDITTESTI', 'NARUTO', 'MIHAJLO'];
        this.currentWordIndex = 0;
        this.totalTime = 0;
        this.totalDeltaTime = 0;
        this.guess = '';
        this.currentlyTyped = '';
        
        // Categories data
        this.categoriesList = [];
        this.currentCategoriesCursor = 0;
        this.allCategoriesReceived = false;
        this.selectedCategory = 0;
        
        // Maintenance state
        this.maintenanceTime = false;
        
        // Pre-allocated objects for return values to reduce garbage collection
        this._formattedTime = '0:00';
        this._handleGuessResult = { 
            status: 'empty',
            nextWord: '',
            time: '0:00'
        };
        this._updateTimerResult = { 
            status: 'inactive',
            time: '0:00',
            wordCount: 0
        };
        this._endGameResult = {
            score: 0,
            completed: false,
            categoryCode: ''
        };
        this._feedbackResult = {
            status: 'success',
            message: '',
            previousHSID: ''
        };
    }

    /**
     * Initialize game state with user data
     * @param {Object} userData - User data from the parent
     */
    initWithUserData(userData) {
        if (userData.username != null && userData.username != '') {
            this.username = userData.username;
            this.userID = userData.userID;
            this.userAllowedToCreate = userData.userAllowedToCreate;
            return true;
        }
        return false;
    }

    /**
     * Reset for starting a new game
     */
    resetForNewGame() {
        this.totalTime = 0;
        this.guess = '';
        this.currentlyTyped = '';
        this.currentWordIndex = 0;
        this.totalDeltaTime = 0;
        this.gameStarted = true;
        this.gameFinished = false;
        this._formattedTime = '0:00';
    }

    /**
     * Start a guessing game
     * @returns {string} - The initial word to display
     */
    startGuessingGame() {
        this.resetForNewGame();
        return this.currentWords[this.currentWordIndex];
    }

    /**
     * Handle a guess
     * @returns {Object} - Status of the guess and next actions
     */
    handleGuess() {
        // Reuse pre-allocated object
        const result = this._handleGuessResult;
        
        if (this.guess == '') {
            result.status = 'empty';
            return result;
        }
        
        if (this.gameStarted && this.currentWordIndex < this.currentWords.length) {
            if (this.guess == this.currentWords[this.currentWordIndex] && this.totalTime < GAME_LENGTH) {
                this.currentWordIndex += 1;
                
                if (this.currentWordIndex <= this.currentWords.length - 1) {
                    this.guess = '';
                    this.totalDeltaTime = 0;
                    this.totalTime = clamp(this.totalTime - 8, 0, 100);
                    
                    // Update the cached time string
                    this.formatTime();
                    
                    // Update and return the cached object
                    result.status = 'correct';
                    result.nextWord = this.currentWords[this.currentWordIndex];
                    result.time = this._formattedTime;
                    return result;
                } else {
                    result.status = 'complete';
                    return result;
                }
            } else {
                this.guess = '';
                result.status = 'incorrect';
                return result;
            }
        }
        
        result.status = 'inactive';
        return result;
    }

    /**
     * Update the game timer
     * @param {number} deltaTime - Time elapsed since last update
     * @returns {Object} - Updated timer data
     */
    updateTimer(deltaTime) {
        // Reuse pre-allocated object
        const result = this._updateTimerResult;
        
        if (this.totalTime >= GAME_LENGTH && this.gameStarted) {
            result.status = 'timeup';
            return result;
        } else if (this.totalTime < GAME_LENGTH && !this.gameFinished) {
            if (this.gameStarted) {
                this.totalTime += deltaTime;
                
                // Update the cached time string
                this.formatTime();
                
                // Update and return the cached object
                result.status = 'running';
                result.time = this._formattedTime;
                result.wordCount = this.currentWordIndex;
                return result;
            }
        }
        
        result.status = 'inactive';
        return result;
    }

    /**
     * Format the current time for display
     * @returns {string} - Formatted time string (M:SS)
     */
    formatTime() {
        const minutes = Math.floor(this.totalTime / 60);
        const seconds = Math.floor(this.totalTime % 60);
        
        // Update cached time string
        this._formattedTime = minutes.toString() + ':' + 
            (seconds < 10 ? '0' : '') + seconds.toString();
            
        return this._formattedTime;
    }

    /**
     * End the game
     * @param {boolean} completed - Whether the game was completed
     * @returns {Object} - End game data
     */
    endGame(completed) {
        this.gameFinished = true;
        this.gameStarted = false;
        
        // Update and return the cached object
        const result = this._endGameResult;
        result.score = this.currentWordIndex;
        result.completed = completed;
        result.categoryCode = this.categoryCode;
        
        return result;
    }

    /**
     * Set category data from a string
     * @param {string} categoryData - Formatted category data string
     */
    setCategoryFromString(categoryData) {
        const parts = categoryData.split(':');
        this.categoryCode = parts[0];
        this.createdBy = parts[1];
        this.categoryTitle = parts[2];
        this.categoryNumOfPlays = parts[3];
        this.categoryHighScore = parts[4];
        this.categoryHSByUsername = parts[5];
        this.categoryHSByID = parts[6];
    }

    /**
     * Set the current words list
     * @param {string} wordsString - Comma-separated words
     */
    setWordsList(wordsString) {
        if (wordsString) {
            // Clear the array first instead of creating a new one
            this.currentWords.length = 0;
            
            // Split and add items to existing array
            const words = wordsString.split(',');
            for (let i = 0; i < words.length; i++) {
                this.currentWords.push(words[i]);
            }
            
            // Fisher-Yates shuffle algorithm (in-place)
            for (let i = this.currentWords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.currentWords[i], this.currentWords[j]] = 
                [this.currentWords[j], this.currentWords[i]];
            }
            
            return true;
        }
        return false;
    }

    /**
     * Update category data after receiving feedback
     * @param {Object} feedbackData - Feedback data from server
     * @returns {Object} - Formatted feedback for display
     */
    updateCategoryWithFeedback(feedbackData) {
        // Create a new object to avoid mutation issues
        const result = {
            status: 'success',
            message: '',
            previousHSID: ''
        };
        
        if (feedbackData.information == null || feedbackData.information == '') {
            result.status = 'error';
            return result;
        }
        
        // Increment plays counter (avoid string-to-number-to-string conversion)
        let numPlays = parseInt(this.categoryNumOfPlays, 10);
        numPlays++;
        this.categoryNumOfPlays = numPlays.toString();

        if (feedbackData.information == 'NEWHS') {
            result.message = this.currentWordIndex + "\n is New High Score!";
            this.categoryHighScore = this.currentWordIndex.toString();
            this.categoryHSByUsername = this.username;
            
            if (!(this.userID == this.categoryHSByID)) {
                result.previousHSID = this.categoryHSByID;
                this.categoryHSByID = this.userID;
            }
            
            // For new high scores, we don't include high score info
            // This matches the original behavior
        }
        else if (feedbackData.information == 'NOTHS') {
            result.message = this.currentWordIndex.toString();
            
            // Only add high score info for non-high scores
            if (feedbackData.categoryInfo) {
                const hsInfo = feedbackData.categoryInfo.split(':');
                result.highScore = {
                    user: hsInfo[0] || '',
                    score: hsInfo[1] || ''
                };
            }
        }

        return result;
    }
} 