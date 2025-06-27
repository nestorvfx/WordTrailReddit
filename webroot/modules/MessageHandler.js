import { clamp, randomPointInCircle } from './utils.js';
import { MAX_WORD_COUNT } from './constants.js';

/**
 * Handles communication between WebView and parent window
 */
export class MessageHandler {
    constructor(gameState, uiManager, particleSystem) {
        this.gameState = gameState;
        this.uiManager = uiManager;
        this.particleSystem = particleSystem;
        this.callbacks = {};
        this.pendingRequests = {};
    }

    /**
     * Initialize handler with callbacks
     */
    initialize(callbacks) {
        this.callbacks = callbacks || {};
        this.setupMessageListener();
        this.notifyWebViewStarted();
    }

    /**
     * Set up window message listener
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data.type == 'devvit-message') {
                this.handleMessage(event.data.data.message);
            }
        });
    }

    /**
     * Route incoming messages to their handlers
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
            case 'deleteCategoryResponse':
                this.handleDeleteCategoryResponse(message.data);
                break;
            default:
                console.log('Unhandled message type:', message.type);
        }
    }

    /**
     * Process initial user data and set up appropriate screen
     */
    handleInitialData(data) {
        if (data.username != null && data.username != '') {
            this.gameState.initWithUserData(data);
            
            if (data.postType == 'mainPost') {
                this.uiManager.showStartScreen();
                
                if (this.callbacks.onInitialDataLoaded) {
                    this.callbacks.onInitialDataLoaded();
                }
            }
            else if (data.postType.startsWith('categoryPost')) {
                const parts = data.postType.split(':');
                this.gameState.categoryCode = parts[1];
                this.gameState.createdBy = parts[2];
                this.gameState.categoryTitle = parts[3];
                this.gameState.categoryNumOfPlays = parts[4];
                this.gameState.categoryHighScore = parts[5];
                this.gameState.categoryHSByUsername = parts[6];
                this.gameState.categoryHSByID = parts[7];
                this.gameState.categoryPostID = parts[8];
                
                // Check for words in both possible positions to ensure compatibility 
                // with both old and new data formats
                const wordsString = parts[10];
                
                if (wordsString) {
                    if (this.gameState.setWordsList(wordsString)) {
                        this.uiManager.startGameInterface();
                        const initialWord = this.gameState.startGuessingGame();
                        
                        if (this.callbacks.onGameStart) {
                            this.callbacks.onGameStart(initialWord);
                        }
                    } else {
                        this.uiManager.displayMessage('There was an error with the word list. Try again');
                    }
                } else {
                    this.uiManager.displayMessage('There was an error. Try again');
                }
            }
        }
    }

    /**
     * Process categories data from backend
     */
    handleSendCategories(data) {
        const requestId = `${this.uiManager.currentSortMethod}-${this.uiManager.currentSortReversed ? 'rev' : 'norm'}-${data.cursor}`;
        delete this.pendingRequests[requestId];
        
        const sceneType = this.gameState.categoriesList.length > 0 ? 'playCategories' : 'initialPlayCategories';
        this.uiManager.displayCategories(data.usersCategories, sceneType);
        
        this.gameState.currentCategoriesCursor = data.cursor;
        if (this.gameState.currentCategoriesCursor == 0) {
            this.gameState.allCategoriesReceived = true;
        }
        
        // Hide loading spinner when data is received
        this.uiManager.hideCategoriesLoading();
    }

    /**
     * Handle append operation for infinite scrolling in Play mode.
     * @private
     * @param {string} categoriesData - New categories data string to append
     */
    _handleCategoryAppend(categoriesData) {
        const newCategories = categoriesData ? categoriesData.split(';') : [];
        // Filter out empty strings that might result from splitting
        const validNewCategories = newCategories.filter(cat => cat !== '');
    
        if (validNewCategories.length === 0) {
            // No valid categories to append, mark as all received
            this.gameState.allCategoriesReceived = true;
            return;
        }
    
        // Get current category codes for deduplication
        const existingCategoryCodes = this.gameState.categoriesList.map(cat => cat.split(':')[0]);
        
        // Add only new categories that aren't already in the list
        let addedCount = 0;
        for (const category of validNewCategories) {
            const categoryCode = category.split(':')[0];
            if (!existingCategoryCodes.includes(categoryCode)) {
                this.gameState.categoriesList.push(category);
                addedCount++;
            }
        }
        
        // If using a reversed sort, we need to re-sort the complete list
        // to ensure correct order (important for proper scrolling with reverse sort)
        if (this.uiManager.currentSortReversed) {
            this.uiManager.sortCategories();
        }
        
        // Render the newly added categories
        for (let i = this.gameState.categoriesList.length - addedCount; i < this.gameState.categoriesList.length; i++) {
            const categoryItem = this.uiManager.createCategoryRow(this.gameState.categoriesList[i], i);
            categoryItem.dataset.renderBatch = 'append';
            categoryItem.dataset.renderIndex = i;
            this.uiManager.elements.categoriesDisplay.appendChild(categoryItem);
        }
        
        // Update scroll buttons state after new content is added
        this.uiManager.updateScrollButtonStates();
        
        // Hide loading spinner after appending is complete
        this.uiManager.hideCategoriesLoading();
    }

    /**
     * Create a row element for a category
     */
    createCategoryRow(categoryString, index) {
        const parts = categoryString.split(':');
        const code = parts[0];
        
        const timestamp = parts.length > 8 ? parts[8] : null;
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
     * Process category words data from backend
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
     * Process category feedback data from backend
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
     * Process user data from backend
     */
    handleSendUserData(data) {
        this.uiManager.displayCategories(data.createdCategories, 'userCategories');
        this.uiManager.elements.deleteDataButton.style.display = 'block';
    }

    /**
     * Process form opened data from backend
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
     * Process form correct data from backend
     */
    handleFormCorrect(data) {
        if (data.categoryTitle == '') {
            this.uiManager.displayMessage('There was an error. Try again.');
        }
        else {
            this.uiManager.displayMessage(data.categoryTitle + ' has been succesfully created');
        }
    }

    /**
     * Process category deleted data from backend
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
     * Process all data deleted data from backend
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
     * Notify parent window that WebView has initialized
     */
    notifyWebViewStarted() {
        window.parent.postMessage(
            { type: 'webViewStarted', data: {} },
            '*'
        );
    }

    /**
     * Request categories from backend with pagination and sorting
     */
    requestCategories(cursor, sortMethod = 'time', reversed = false) {
        const requestId = `${sortMethod}-${reversed ? 'rev' : 'norm'}-${cursor}`;
        
        if (this.pendingRequests[requestId]) {
            return;
        }
        
        this.pendingRequests[requestId] = true;
        
        // Show loading spinner
        this.uiManager.showCategoriesLoading();
        
        window.parent.postMessage(
            {
                type: 'updateCategories',
                data: {
                    cursor: cursor,
                    sortMethod: sortMethod,
                    reversed: reversed
                }
            },
            '*'
        );
        
        // Set a timeout to clear the pending request and loading state if no response
        setTimeout(() => {
            delete this.pendingRequests[requestId];
            this.uiManager.hideCategoriesLoading();
        }, 5000);
    }

    /**
     * Request words for a category from backend
     */
    requestCategoryWords(categoryCode) {
        window.parent.postMessage(
            { type: 'wordsRequest', data: { categoryCode } },
            '*'
        );
    }

    /**
     * Start form for category creation
     */
    startCategoryForm() {
        console.log("Sending startForm message to parent window");
        window.parent.postMessage(
            { type: 'startForm', data: {} },
            '*'
        );
    }

    /**
     * Request user data from backend
     */
    requestUserData() {
        window.parent.postMessage(
            { type: 'requestUserData', data: {} },
            '*'
        );
    }

    /**
     * Delete a category
     */
    deleteCategory(categoryCode) {
        window.parent.postMessage(
            { type: 'deleteCategory', data: { categoryCode } },
            '*'
        );
    }

    /**
     * Delete all user data
     */
    deleteAllUserData() {
        window.parent.postMessage(
            { type: 'deleteAllUserData', data: {} },
            '*'
        );
    }

    /**
     * Update category information
     */
    updateCategoryInfo(data) {
        // 🔍 MOBILE BUG DETECTION: Comprehensive environment logging
        const logTimestamp = Date.now();
        const userAgent = navigator.userAgent;
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent);
        
        console.log(`🌐 ENVIRONMENT_DETECTION: Mobile=${isMobile}, iOS=${isIOS}, Android=${isAndroid}, Safari=${isSafari}, Chrome=${isChrome}`);
        console.log(`🌐 USER_AGENT: ${userAgent}`);
        
        // 🔍 SCORE LOGGING: Enhanced logging with environment context
        console.log(`🎯 SCORE_TRACKING_2_SENDING_TO_BACKEND: newScore=${data.newScore}, scoreType=${typeof data.newScore}, data=${JSON.stringify(data)}, timestamp=${logTimestamp}`);
        
        // 🚨 SCORE 0 BUG DETECTION: Enhanced mobile-specific detection
        if (data.newScore === 0 && data.guessedAll === true) {
            console.error(`🚨 SCORE_0_BUG_DETECTED_FRONTEND: Sending score=0 but guessedAll=true - THIS IS THE BUG!`);
            console.error(`🚨 SCORE_0_BUG_ENVIRONMENT: Mobile=${isMobile}, iOS=${isIOS}, Android=${isAndroid}, Safari=${isSafari}`);
            console.error(`🚨 SCORE_0_BUG_AGENT: ${userAgent}`);
            
            // Log the exact state that led to this bug
            console.error(`🚨 SCORE_0_BUG_STATE: gameState.currentWordIndex=${this.gameState?.currentWordIndex}, gameFinished=${this.gameState?.gameFinished}`);
        }
        
        // 🔍 ADDITIONAL VALIDATION: Check for other suspicious patterns
        if (data.newScore === 0 && data.guessedAll === false) {
            console.log(`ℹ️ ZERO_SCORE_NORMAL: User legitimately scored 0`);
        }
        
        if (data.newScore === null || data.newScore === undefined) {
            console.error(`🚨 NULL_SCORE_DETECTED: newScore is ${data.newScore}, this could cause parsing issues`);
        }
        
        if (typeof data.newScore !== 'number') {
            console.error(`🚨 NON_NUMBER_SCORE: newScore type is ${typeof data.newScore}, value=${data.newScore}`);
        }
        
        // 🔍 MEMORY PRESSURE DETECTION: Log if we're under memory pressure (mobile issue)
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            console.log(`📊 MEMORY_USAGE: ${memoryUsage.toFixed(1)}% (${memory.usedJSHeapSize}/${memory.jsHeapSizeLimit})`);
            
            if (memoryUsage > 80) {
                console.warn(`⚠️ HIGH_MEMORY_USAGE: ${memoryUsage.toFixed(1)}% - this could cause state corruption on mobile`);
            }
        }
        
        window.parent.postMessage(
            { type: 'updateCategoryInfo', data },
            '*'
        );
        
        // 🔍 SCORE LOGGING: Confirm message was sent
        console.log(`✅ SCORE_TRACKING_3_MESSAGE_SENT: postMessage called with score=${data.newScore}`);
    }

    /**
     * Handle delete category response
     */
    handleDeleteCategoryResponse(data) {
        // Hide the confirmation modal regardless of success/failure
        const deleteConfirmation = document.getElementById('deleteConfirmationScreen');
        if (deleteConfirmation) {
            deleteConfirmation.style.display = 'none';
        }
        
        // Restore pointer events to allow interaction
        document.body.style.pointerEvents = 'all';
        
        // Refresh the settings screen if success
        if (data.success) {
            // If we have category code in the data, remove it from the UI immediately
            if (data.categoryCode) {
                try {
                    // Remove from categories list in GameState
                    this.gameState.categoriesList = this.gameState.categoriesList.filter(
                        cat => cat.split(':')[0] !== data.categoryCode
                    );
                    
                    // Find and remove the specific row from UI
                    const selector = `.list-row[data-code="${data.categoryCode}"]`;
                    const categoryRow = document.querySelector(selector);
                    
                    if (categoryRow) {
                        // Remove the row with animation
                        categoryRow.style.transition = 'opacity 0.3s ease-out';
                        categoryRow.style.opacity = '0';
                        
                        setTimeout(() => {
                            categoryRow.remove();
                            
                            // Update the indexes of remaining rows
                            const rows = document.querySelectorAll('.list-row');
                            rows.forEach((row, index) => {
                                row.setAttribute('data-index', index);
                            });
                            
                            // Update scroll buttons after removing the item
                            this.uiManager.updateScrollButtonStates();
                            
                            // Update empty state message if no categories left
                            if (rows.length === 0) {
                                const emptyStateMsg = document.querySelector('.emptyElement');
                                if (!emptyStateMsg) {
                                    const emptyElement = document.createElement('div');
                                    emptyElement.classList.add('emptyElement');
                                    emptyElement.innerHTML = '<span class="emptyText">You have no categories.\n(create one from main screen)</span>';
                                    document.getElementById('rows-wrapper').appendChild(emptyElement);
                                }
                            }
                        }, 300);
                    } else {
                        // If we can't find the row, refresh the data
                        this.requestUserData();
                    }
                } catch (err) {
                    // If there's any error in the UI update, fallback to refreshing data
                    console.log("Error updating UI after deletion, refreshing data instead");
                    this.requestUserData();
                }
            } else {
                // If no category code, refresh all user data
                this.requestUserData();
            }
            
            // Show success toast
            this.uiManager.displayMessage(data.message || 'Category deleted successfully');
        } else {
            // Show error message
            this.uiManager.displayMessage(data.message || 'Failed to delete category');
        }
    }
}

/**
 * Formats timestamp into relative time string (e.g., "now", "5min", "2d")
 */
function formatRelativeTime(timestamp) {
    if (!timestamp || isNaN(parseInt(timestamp))) {
        return '';
    }
    
    try {
        const now = new Date();
        const date = new Date(parseInt(timestamp) * 1000);
        
        const diffMs = now - date;
        
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
        console.error("Error formatting timestamp:", e);
        return '';
    }
}