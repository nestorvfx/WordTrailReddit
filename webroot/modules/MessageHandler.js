import { clamp, randomPointInCircle } from './utils.js';
import { MAX_WORD_COUNT } from './constants.js';

/**
 * Class that handles communication with the parent window
 */
export class MessageHandler {
    constructor(gameState, uiManager, particleSystem) {
        this.gameState = gameState;
        this.uiManager = uiManager;
        this.particleSystem = particleSystem;
        this.callbacks = {};
        
        // Add request tracking to prevent duplicate requests
        this.pendingRequests = {};
    }

    /**
     * Initialize message handler with callbacks
     * @param {Object} callbacks - Callback functions for message events
     */
    initialize(callbacks) {
        this.callbacks = callbacks || {};
        this.setupMessageListener();
        this.notifyWebViewStarted();
        
        // Do NOT show the starting screen here; wait for initialData message
        // this.uiManager.showStartScreen(); 
    }

    /**
     * Set up the window message event listener
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data.type == 'devvit-message') {
                const message = event.data.data.message;
                this.handleMessage(message);
            }
        });
    }

    /**
     * Handle incoming messages
     * @param {Object} message - The received message
     */
    handleMessage(message) {
        switch (message.type) {
            case 'initialData':
                this.handleInitialData(message.data);
                break;
            
            case 'sendCategories':
                this.handleSendCategories(message.data);
                break;
            
            case 'sendCategoryWords':
                this.handleSendCategoryWords(message.data);
                break;
            
            case 'updateCategoryFeedback':
                this.handleUpdateCategoryFeedback(message.data);
                break;
            
            case 'sendUserData':
                this.handleSendUserData(message.data);
                break;
            
            case 'formOpened':
                this.handleFormOpened(message.data);
                break;
            
            case 'formCorrect':
                this.handleFormCorrect(message.data);
                break;
            
            case 'categoryDeleted':
                this.handleCategoryDeleted(message.data);
                break;
            
            case 'allDataDeleted':
                this.handleAllDataDeleted(message.data);
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
        }
    }

    /**
     * Handle initial data message
     * @param {Object} data - Initial data from parent
     */
    handleInitialData(data) {
        if (data.username != null && data.username != '') {
            const userDataInitialized = this.gameState.initWithUserData(data);
            
            if (data.postType == 'mainPost') {
                // Main post, show the start screen with updated UI based on user permissions
                this.uiManager.showStartScreen();
                
                if (this.callbacks.onInitialDataLoaded) {
                    this.callbacks.onInitialDataLoaded();
                }
            }
            else if (data.postType.startsWith('categoryPost')) {
                // Category post, start game directly
                const parts = data.postType.split(':');
                this.gameState.categoryCode = parts[1];
                this.gameState.createdBy = parts[2];
                this.gameState.categoryTitle = parts[3];
                this.gameState.categoryNumOfPlays = parts[4];
                this.gameState.categoryHighScore = parts[5];
                this.gameState.categoryHSByUsername = parts[6];
                this.gameState.categoryHSByID = parts[7];
                this.gameState.categoryPostID = parts[8];
                
                if (parts[9]) {
                    this.gameState.setWordsList(parts[9]);
                    
                    this.uiManager.startGameInterface();
                    
                    const initialWord = this.gameState.startGuessingGame();
                    
                    if (this.callbacks.onGameStart) {
                        this.callbacks.onGameStart(initialWord);
                    }
                } else {
                    this.uiManager.displayMessage('There was an error. Try again');
                }
            }
        }
    }

    /**
     * Handle send categories message
     * @param {Object} data - Categories data
     */
    handleSendCategories(data) {
        // Remove the pending request flag
        const requestId = `${this.uiManager.currentSortMethod}-${data.cursor}`;
        delete this.pendingRequests[requestId];
        
        // When we receive categories, correctly identify if this is an initial load or a scroll append
        const sceneType = this.gameState.categoriesList.length > 0 ? 'playCategories' : 'initialPlayCategories';
        
        if (data.usersCategories) {
            console.log(`[DEBUG_CATEGORY] Received categories data - cursor: ${data.cursor}, sceneType: ${sceneType}`);
            
            const categories = data.usersCategories.split(';');
            if (categories.length > 0 && categories[0]) {
                // Log the first category (which should be newest and potentially a newly created one)
                console.log(`[DEBUG_CATEGORY] First category in response: ${categories[0]}`);
                
                // Split and analyze the first category's structure
                const parts = categories[0].split(':');
                console.log(`[DEBUG_CATEGORY] First category parts:`);
                console.log(`  Code: ${parts[0]}`);
                console.log(`  Creator: ${parts[1]}`);
                console.log(`  Title: ${parts[2]}`);
                console.log(`  Plays: ${parts[3]}`);
                console.log(`  HighScore: ${parts[4]}`);
            }
        }
        
        this.uiManager.displayCategories(data.usersCategories, sceneType);
        
        // Update cursor for pagination
        this.gameState.currentCategoriesCursor = data.cursor;
        if (this.gameState.currentCategoriesCursor == 0) {
            this.gameState.allCategoriesReceived = true;
        }
    }

    /**
     * Create a row element for a category
     * @param {string} categoryString - Category data string
     * @param {number} index - Index of the category
     * @returns {HTMLElement} - The created row element
     */
    createCategoryRow(categoryString, index) {
        const parts = categoryString.split(':');
        const code = parts[0];
        
        // Extract timestamp (should be at index 8 since the categoryCode is at index 0)
        const timestamp = parts.length > 8 ? parts[8] : null;
        
        // Format the timestamp
        const formattedTime = formatRelativeTime(timestamp);
        
        const row = document.createElement('div');
        row.className = 'list-row';
        row.setAttribute('data-index', index);
        row.setAttribute('data-code', code);
        
        row.innerHTML = `
            <div class="col-title">${parts[2]}</div>
            <div class="col-created">${parts[1]}</div>
            <div class="col-played">${parts[3]}</div>
            <div class="col-hs">${parts[4]}</div>
            <div class="col-timestamp">${formattedTime}</div>
        `;
        
        row.addEventListener('click', () => {
            this.handleRowClick(row);
        });
        
        return row;
    }

    /**
     * Handle send category words message
     * @param {Object} data - Category words data
     */
    handleSendCategoryWords(data) {
        if (data.words != null && data.words != 'error') {
            this.uiManager.startGameInterface();
            
            if (this.gameState.setWordsList(data.words)) {
                const initialWord = this.gameState.startGuessingGame();
                
                if (this.callbacks.onGameStart) {
                    this.callbacks.onGameStart(initialWord);
                }
            }
        }
        else {
            this.uiManager.displayMessage('There was an error. Try again');
        }
    }

    /**
     * Handle update category feedback message
     * @param {Object} data - Category feedback data
     */
    handleUpdateCategoryFeedback(data) {
        const feedbackResult = this.gameState.updateCategoryWithFeedback(data);
        
        if (feedbackResult.status === 'error') {
            this.uiManager.displayMessage('There was an error.');
            return;
        }
        
        this.uiManager.displayEndScreen(false, feedbackResult);
    }

    /**
     * Handle send user data message
     * @param {Object} data - User data
     */
    handleSendUserData(data) {
        this.uiManager.displayCategories(data.createdCategories, 'userCategories');
        this.uiManager.elements.deleteDataButton.style.display = 'block';
    }

    /**
     * Handle form opened message
     * @param {Object} data - Form opened data
     */
    handleFormOpened(data) {
        if (!data.correctly || data.correctly == 'false') {
            this.uiManager.displayMessage('There was an error starting the creation process. Try again');
        } else if (data.correctly == 'exceeded') {
            this.uiManager.displayMessage('You have currently max of 10 active categories. In Settings you can remove them and create space for new.');
        }
        document.body.style.pointerEvents = 'all';
    }

    /**
     * Handle form correct message
     * @param {Object} data - Form correct data
     */
    handleFormCorrect(data) {
        console.log(`[DEBUG_CATEGORY] Form submitted correctly for category: "${data.categoryTitle}"`);
        
        if (data.categoryTitle == '') {
            this.uiManager.displayMessage('There was an error. Try again.');
        }
        else {
            this.uiManager.displayMessage(data.categoryTitle + ' has been succesfully created');
            
            // After successful creation, we'll request categories again
            console.log(`[DEBUG_CATEGORY] Will request categories after creation`);
        }
    }

    /**
     * Handle category deleted message
     * @param {Object} data - Category deleted data
     */
    handleCategoryDeleted(data) {
        if (data.deleted) {
            this.uiManager.displayMessage('Category has been deleted.');
            this.uiManager.displayCategories('', 'userCategoriesRemoveOne');
        }
        else {
            this.uiManager.displayMessage('There was an error. Try again, or reach r/nestorvfx');
        }
        this.uiManager.elements.deleteConfirmationScreen.style.display = 'none';
        document.body.style.pointerEvents = 'all';
    }

    /**
     * Handle all data deleted message
     * @param {Object} data - All data deleted data
     */
    handleAllDataDeleted(data) {
        if (data.deleted) {
            this.uiManager.displayMessage('Data has been deleted.');
            this.uiManager.displayCategories('', 'userCategories');
        }
        else {
            this.uiManager.displayMessage('There was an error. Try again, or reach r/nestorvfx');
        }
        this.uiManager.elements.deleteConfirmationScreen.style.display = 'none';
        document.body.style.pointerEvents = 'all';
    }

    /**
     * Notify parent that WebView has started
     */
    notifyWebViewStarted() {
        window.parent.postMessage(
            { type: 'webViewStarted', data: {} },
            '*'
        );
    }

    /**
     * Send message to request categories
     * @param {number} cursor - Cursor position for pagination
     * @param {string} sortMethod - The sort method to use (time, plays, score)
     */
    requestCategories(cursor, sortMethod = 'time') {
        // Create a unique request ID based on cursor and sort method
        const requestId = `${sortMethod}-${cursor}`;
        
        // Skip if an identical request is already pending
        if (this.pendingRequests[requestId]) {
            return;
        }
        
        console.log(`[DEBUG_CATEGORY] Requesting categories: cursor=${cursor}, sortMethod=${sortMethod}`);
        
        // Mark this request as pending
        this.pendingRequests[requestId] = true;
        
        window.parent.postMessage(
            {
                type: 'updateCategories',
                data: {
                    cursor: cursor,
                    sortMethod: sortMethod
                }
            },
            '*'
        );
        
        // Set a timeout to clear the pending request flag if no response is received
        setTimeout(() => {
            delete this.pendingRequests[requestId];
        }, 5000); // 5 second timeout
    }

    /**
     * Send message to request words for a category
     * @param {string} categoryCode - Category code
     */
    requestCategoryWords(categoryCode) {
        window.parent.postMessage(
            { type: 'wordsRequest', data: { categoryCode } },
            '*'
        );
    }

    /**
     * Send message to start form for category creation
     */
    startCategoryForm() {
        console.log("Sending startForm message to parent window");
        window.parent.postMessage(
            { type: 'startForm', data: {} },
            '*'
        );
    }

    /**
     * Send message to request user data
     */
    requestUserData() {
        window.parent.postMessage(
            { type: 'requestUserData', data: {} },
            '*'
        );
    }

    /**
     * Send message to delete a category
     * @param {string} categoryCode - Category code to delete
     */
    deleteCategory(categoryCode) {
        window.parent.postMessage(
            { type: 'deleteCategory', data: { categoryCode } },
            '*'
        );
    }

    /**
     * Send message to delete all user data
     */
    deleteAllUserData() {
        window.parent.postMessage(
            { type: 'deleteAllUserData', data: {} },
            '*'
        );
    }

    /**
     * Send message to update category information
     * @param {Object} data - Category update data
     */
    updateCategoryInfo(data) {
        window.parent.postMessage(
            { type: 'updateCategoryInfo', data },
            '*'
        );
    }
}

/**
 * Utility function to format timestamps
 * @param {string} timestamp - Timestamp to format
 * @returns {string} - Formatted relative time
 */
function formatRelativeTime(timestamp) {
    if (!timestamp || isNaN(parseInt(timestamp))) {
        return '';
    }
    
    try {
        const now = new Date();
        const date = new Date(parseInt(timestamp) * 1000);
        
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return "Today";
        } else if (diffDays === 1) {
            return "1d";  // Changed from "Yesterday" to "1d"
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
        console.error("Error formatting timestamp:", e);
        return '';
    }
}