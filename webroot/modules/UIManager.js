import { displayBarMessage } from './utils.js';

/**
 * Utility function to format timestamps into relative time
 * @param {number|string} timestamp - Unix timestamp
 * @returns {string} - Formatted relative time string
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
            return "Yesterday";
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}w ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months}mo ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years}y ago`;
        }
    } catch (e) {
        console.error("Error formatting timestamp:", e);
        return '';
    }
}

/**
 * Class that manages the user interface elements and interactions
 */
export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.elements = {};
        this.typeOfConfirm = 'category';
        this.currentSortMethod = 'time'; // Changed default sort from 'plays' to 'time' (newest first)
        this.initUIElements();
        
        // Clear categories display initially
        if (this.elements.categoriesDisplay) {
            this.elements.categoriesDisplay.innerHTML = '';
        }
        
        // Make sure form message opacity is reset
        if (this.elements.formMessage) {
            this.elements.formMessage.style.opacity = 0;
        }
    }

    /**
     * Initialize and cache UI elements
     */
    initUIElements() {
        // Screens
        this.elements.centeringScreen = document.getElementById('centeringScreen');
        this.elements.maintenanceOverlay = document.getElementById('maintenanceOverlay');
        this.elements.startingScreen = document.getElementById('starting-screen');
        this.elements.categoriesScreen = document.getElementById('categoriesScreen');
        this.elements.deleteConfirmationScreen = document.getElementById('deleteConfirmationScreen');

        // Buttons
        this.elements.playButton = document.getElementById('play-button');
        this.elements.createCategoryButton = document.getElementById('create-category-button');
        this.elements.settingsButton = document.getElementById('settingsButton');
        this.elements.startButton = document.getElementById('startButton');
        this.elements.returnToStartButton = document.getElementById('returnToStartButton');
        this.elements.retryButton = document.getElementById('retryButton');
        this.elements.deleteCategoryButton = document.getElementById('deleteCategoryButton');
        this.elements.deleteDataButton = document.getElementById('deleteDataButton');
        this.elements.deleteConfirmButton = document.getElementById('confirmButton');
        this.elements.deleteCancelButton = document.getElementById('cancelButton');
        this.elements.scrollButtonUp = document.getElementById('scrollButtonUp');
        this.elements.scrollButtonDown = document.getElementById('scrollButtonDown');

        // Display elements
        this.elements.timeDisplay = document.getElementById('timeDisplay');
        this.elements.wordCount = document.getElementById('wordCount');
        this.elements.finalScore = document.getElementById('final-score');
        this.elements.highScore = document.getElementById('highScore');
        this.elements.formMessage = document.getElementById('formMessage');
        this.elements.deleteText = document.getElementById('deleteText');
        this.elements.categoriesDisplay = document.getElementById('rows-wrapper');

        // Keyboard elements
        this.elements.keyboard = document.getElementById('keyboard');
        this.elements.keyboardOutput = document.getElementById('output');
        this.elements.keys = document.querySelectorAll('.key');

        // Sorting elements
        this.elements.sortButton = document.getElementById('sortButton');
        this.elements.sortDropdown = document.getElementById('sortDropdown');
        this.elements.currentSortText = document.getElementById('currentSort');
        this.elements.sortOptions = document.querySelectorAll('.sort-option');
    }

    /**
     * Attach event listeners to UI elements using event delegation
     * @param {Object} callbacks - Callback functions for different events
     */
    setupEventListeners(callbacks) {
        // Main UI click delegation
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Find the clicked element or its closest button parent
            const buttonElement = target.closest('button') || target;
            const buttonId = buttonElement.id;
            
            // Handle specific button clicks based on ID
            switch (buttonId) {
                case 'play-button':
                    // Reset categories state
                    this.gameState.currentCategoriesCursor = 0;
                    this.gameState.allCategoriesReceived = false;
                    this.gameState.categoriesList = [];
                    
                    if (callbacks.onPlayClick) callbacks.onPlayClick();
                    break;
                    
                case 'create-category-button':
                    if (this.gameState.userAllowedToCreate) {
                        if (callbacks.onCreateCategoryClick) callbacks.onCreateCategoryClick();
                    }
                    break;
                    
                case 'settingsButton':
                    this.gameState.currentCategoriesCursor = 0;
                    this.gameState.allCategoriesReceived = true;
                    this.gameState.categoriesList = [];
                    
                    if (callbacks.onSettingsClick) callbacks.onSettingsClick();
                    break;
                    
                case 'startButton':
                    if (this.elements.scrollButtonDown.style.display != 'none') {
                        const categoryData = this.gameState.categoriesList[this.gameState.selectedCategory];
                        this.gameState.setCategoryFromString(categoryData);
                        
                        if (callbacks.onStartClick) callbacks.onStartClick(this.gameState.categoryCode);
                    }
                    break;
                    
                case 'deleteCategoryButton':
                    if (this.elements.scrollButtonDown.style.display != 'none') {
                        this.elements.deleteText.textContent = 'Confirm deleting ' + 
                            this.gameState.categoryTitle + ' category?';
                        this.typeOfConfirm = 'category';
                        this.elements.deleteConfirmationScreen.style.display = 'flex';
                    }
                    break;
                    
                case 'returnToStartButton':
                    this.showStartScreen();
                    
                    if (callbacks.onReturnToStartClick) callbacks.onReturnToStartClick();
                    break;
                    
                case 'deleteDataButton':
                    this.elements.deleteText.textContent = 
                        'Confirm deleting all of your Reddit info within Word Trail Game itself + category posts created?';
                    this.typeOfConfirm = 'allData';
                    this.elements.deleteConfirmationScreen.style.display = 'flex';
                    break;
                    
                case 'confirmButton':
                    if (this.typeOfConfirm == 'allData') {
                        if (callbacks.onDeleteAllData) callbacks.onDeleteAllData();
                    }
                    else if (this.typeOfConfirm == 'category') {
                        const categoryData = this.gameState.categoriesList[this.gameState.selectedCategory];
                        this.gameState.setCategoryFromString(categoryData);
                        
                        if (callbacks.onDeleteCategory) callbacks.onDeleteCategory(this.gameState.categoryCode);
                    }
                    document.body.style.pointerEvents = 'none';
                    break;
                    
                case 'cancelButton':
                    this.elements.deleteConfirmationScreen.style.display = 'none';
                    break;
                    
                case 'retryButton':
                    this.hideGameEndElements();
                    
                    // Shuffle words
                    this.gameState.currentWords = this.gameState.currentWords.sort(() => Math.random() - 0.5);
                    
                    if (callbacks.onRetryClick) callbacks.onRetryClick();
                    break;
                    
                case 'scrollButtonUp':
                    const firstUpElement = this.elements.categoriesDisplay.querySelector('.list-row');
                    if (firstUpElement) {
                        const elementHeightUp = firstUpElement.offsetHeight + 
                            parseFloat(getComputedStyle(firstUpElement).marginBottom);
                        this.elements.categoriesDisplay.scrollBy({ top: -elementHeightUp, behavior: 'smooth' });
                    }
                    break;
                    
                case 'scrollButtonDown':
                    const firstDownElement = this.elements.categoriesDisplay.querySelector('.list-row');
                    if (firstDownElement) {
                        const elementHeightDown = firstDownElement.offsetHeight + 
                            parseFloat(getComputedStyle(firstDownElement).marginBottom);
                        this.elements.categoriesDisplay.scrollBy({ top: elementHeightDown, behavior: 'smooth' });
                    }
                    break;
            }
            
            // Handle keyboard click events separately (since these don't have IDs but have classes)
            if (buttonElement.classList.contains('key')) {
                this.handleKeyboardClick(buttonElement);
            }
        });

        // Categories scroll event - needs to remain separate
        this.elements.categoriesDisplay.addEventListener('scroll', () => {
            // Update scroll button states whenever the user scrolls
            this.updateScrollButtonStates();
            
            // Only trigger the callback if bottom reached and more categories to load
            if (this.elements.scrollButtonDown.disabled && 
                !this.gameState.allCategoriesReceived && 
                callbacks.onCategoriesScrollEnd) {
                callbacks.onCategoriesScrollEnd(this.gameState.currentCategoriesCursor);
            }
        });

        // Add sorting functionality
        this.setupSortingListeners();
    }

    /**
     * Setup listeners for the sorting dropdown
     */
    setupSortingListeners() {
        // Toggle dropdown visibility when sort button is clicked
        this.elements.sortButton.addEventListener('click', () => {
            this.elements.sortButton.classList.toggle('active');
            this.elements.sortDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('#sortContainer')) {
                this.elements.sortButton.classList.remove('active');
                this.elements.sortDropdown.classList.remove('show');
            }
        });

        // Handle sort option selection
        this.elements.sortOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.currentSortMethod = option.dataset.sort;
                this.elements.currentSortText.textContent = option.textContent;
                
                // Update active class
                this.elements.sortOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Close dropdown
                this.elements.sortButton.classList.remove('active');
                this.elements.sortDropdown.classList.remove('show');
                
                // Re-sort and display categories
                if (this.gameState.categoriesList && this.gameState.categoriesList.length > 0) {
                    this.sortCategories();
                    this.renderCategoriesList();
                }
            });
        });

        // Set the initial active sort option to match the default sort method
        this.elements.sortOptions.forEach(opt => {
            if (opt.dataset.sort === this.currentSortMethod) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    /**
     * Sort the categories based on the current sorting method
     */
    sortCategories() {
        if (!this.gameState.categoriesList || this.gameState.categoriesList.length === 0) {
            return;
        }
        
        switch (this.currentSortMethod) {
            case 'time':
                // Sort by timestamp (newest first)
                this.gameState.categoriesList.sort((a, b) => {
                    const partsA = a.split(':');
                    const partsB = b.split(':');
                    const timestampA = partsA.length > 8 ? parseInt(partsA[8]) : 0;
                    const timestampB = partsB.length > 8 ? parseInt(partsB[8]) : 0;
                    return timestampB - timestampA; // Descending (newest first)
                });
                break;
                
            case 'plays':
                // Sort by number of plays (highest first)
                this.gameState.categoriesList.sort((a, b) => {
                    const playsA = parseInt(a.split(':')[3]) || 0;
                    const playsB = parseInt(b.split(':')[3]) || 0;
                    return playsB - playsA; // Descending
                });
                break;
                
            case 'score':
                // Sort by high score (highest first)
                this.gameState.categoriesList.sort((a, b) => {
                    const scoreA = parseInt(a.split(':')[4]) || 0;
                    const scoreB = parseInt(b.split(':')[4]) || 0;
                    return scoreB - scoreA; // Descending
                });
                break;
        }
    }

    /**
     * Render the categories list after sorting
     */
    renderCategoriesList() {
        // Clear current list
        this.elements.categoriesDisplay.innerHTML = '';
        
        // Add sorted categories
        for (let i = 0; i < this.gameState.categoriesList.length; i++) {
            const categoryItem = this.createCategoryRow(this.gameState.categoriesList[i], i);
            this.elements.categoriesDisplay.appendChild(categoryItem);
        }
        
        // Reset scroll position
        this.elements.categoriesDisplay.scrollTop = 0;
        this.updateScrollButtonStates();
    }

    /**
     * Handle keyboard key clicks
     * @param {HTMLElement} key - The key element that was clicked
     */
    handleKeyboardClick(key) {
        if (key.classList.contains('space')) {
            if (this.gameState.currentlyTyped.length < 12) {
                const letter = document.createElement('div');
                letter.className = 'output-item';
                letter.textContent = ' ';
                this.gameState.currentlyTyped += ' ';
                this.elements.keyboardOutput.appendChild(letter);
            }
        } else if (key.classList.contains('submit')) {
            this.gameState.guess = this.gameState.currentlyTyped;
            this.gameState.currentlyTyped = '';
            this.elements.keyboardOutput.innerHTML = '';
        } else if (key.classList.contains('backspace')) {
            this.gameState.currentlyTyped = this.gameState.currentlyTyped.substring(
                0, this.gameState.currentlyTyped.length - 1
            );
            const lastChild = this.elements.keyboardOutput.lastChild;
            if (lastChild) this.elements.keyboardOutput.removeChild(lastChild);
        } else {
            if (this.gameState.currentlyTyped.length < 12) {
                const letter = document.createElement('div');
                letter.className = 'output-item';
                letter.textContent = key.textContent;
                this.gameState.currentlyTyped += key.textContent;
                this.elements.keyboardOutput.appendChild(letter);
            }
        }
    }

    /**
     * Show the main start screen
     * This is now the single source of truth for this screen's UI state
     */
    showStartScreen() {
        // Hide all other potentially visible elements
        this.elements.categoriesScreen.style.display = 'none';
        this.elements.deleteConfirmationScreen.style.display = 'none';
        this.elements.retryButton.style.display = 'none';
        this.elements.finalScore.style.display = 'none';
        this.elements.highScore.style.display = 'none';
        this.elements.timeDisplay.style.display = 'none';
        this.elements.wordCount.style.display = 'none';
        this.elements.keyboard.style.display = 'none';
        this.elements.keyboardOutput.style.display = 'none';
        this.elements.startButton.style.display = 'none';
        this.elements.deleteCategoryButton.style.display = 'none';
        this.elements.deleteDataButton.style.display = 'none';
        this.elements.returnToStartButton.style.display = 'none';
        
        // Always display the main start screen container
        this.elements.startingScreen.style.display = 'flex';

        // Set visibility and position based on gameState.userAllowedToCreate
        if (this.gameState.userAllowedToCreate) {
            this.elements.createCategoryButton.style.display = 'block';
            this.elements.settingsButton.style.top = '75%'; 
        } else {
            this.elements.createCategoryButton.style.display = 'none';
            this.elements.settingsButton.style.top = '60%';
        }
        this.elements.settingsButton.style.display = 'block'; // Always show settings
        this.elements.playButton.style.display = 'block'; // Always show play
    }

    /**
     * Show the categories selection screen
     * @param {string} categoriesData - Categories data string
     * @param {string} sceneType - Type of categories screen to show
     */
    displayCategories(categoriesData, sceneType) {
        // Process the incoming categories data
        if (sceneType == 'userCategoriesRemoveOne') {
            this.gameState.categoriesList.splice(this.gameState.selectedCategory, 1);
            this.elements.categoriesDisplay.innerHTML = '';
        }
        else if (this.gameState.currentCategoriesCursor == 0 || sceneType == 'userCategories') {
            const cCategories = categoriesData.split(';');
            this.gameState.categoriesList = cCategories;
            this.elements.categoriesDisplay.innerHTML = '';
        } else if (sceneType == 'playCategories') {
            const cCategories = categoriesData.split(';');
            this.gameState.categoriesList.push(...cCategories);
        }

        // Always sort categories immediately after receiving them
        this.sortCategories();

        if (!(this.gameState.categoriesList == '' || this.gameState.categoriesList[0] == '')) {
            // Update the sort button text to reflect the current sort method
            const sortLabelMap = {
                'time': 'Newest',
                'plays': 'Plays',
                'score': 'High Score'
            };
            this.elements.currentSortText.textContent = sortLabelMap[this.currentSortMethod];
            
            // Highlight the active sort option in dropdown
            this.elements.sortOptions.forEach(opt => {
                if (opt.dataset.sort === this.currentSortMethod) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
            
            // Instead of directly rendering here, use the dedicated rendering method
            // This ensures consistent sorting behavior across all code paths
            this.renderCategoriesList();
            
            // Remove any existing click event listeners before adding a new one
            // This prevents duplicate handlers from firing when clicking categories
            if (this._categoryClickHandler) {
                this.elements.categoriesDisplay.removeEventListener('click', this._categoryClickHandler);
            }
            
            // Create new click handler and store reference
            this._categoryClickHandler = (event) => {
                const categoryItem = event.target.closest('.list-row');
                if (!categoryItem) return; // Not a category item
                
                // Remove 'selected' class from the previously selected item
                const prevSelected = this.elements.categoriesDisplay.querySelector('.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
                
                // Add 'selected' class to the clicked item
                categoryItem.classList.add('selected');
                
                // Update the game state with the selected category
                const categoryIndex = parseInt(categoryItem.dataset.categoryIndex);
                this.gameState.setCategoryFromString(this.gameState.categoriesList[categoryIndex]);
                this.gameState.selectedCategory = categoryIndex;
            };
            
            // Add the new handler
            this.elements.categoriesDisplay.addEventListener('click', this._categoryClickHandler);
            
            // Enable buttons for category selection
            this.elements.startButton.style.borderColor = "#ffffff";
            this.elements.deleteCategoryButton.style.borderColor = "#ffffff";
            this.elements.scrollButtonDown.style.display = 'flex';
            this.elements.scrollButtonUp.style.display = 'flex';
            
            // Reset scroll position and scroll button states
            this.elements.categoriesDisplay.scrollTop = 0;
            this.elements.scrollButtonUp.disabled = true; // Top button always starts disabled
            this.elements.scrollButtonDown.disabled = false; // Bottom button always starts enabled
        }
        else {
            const categoryItem = document.createElement('li');
            categoryItem.classList.add('emptyElement');
            categoryItem.innerHTML = 
                "<span class=\"emptyText\">There are currently no available categories.\n"+
                "(feel free to create one) </span> ";
            this.elements.categoriesDisplay.appendChild(categoryItem);

            // Disable buttons when no categories
            this.elements.startButton.style.borderColor = "#737373";
            this.elements.deleteCategoryButton.style.borderColor = "#737373";
            this.elements.scrollButtonDown.style.display = 'none';
            this.elements.scrollButtonUp.style.display = 'none';
        }

        // Show categories screen
        this.elements.returnToStartButton.style.top = '84%';
        this.elements.returnToStartButton.style.display = 'block';
        this.elements.categoriesScreen.style.display = 'flex';
        this.elements.startingScreen.style.display = 'none';
        
        if (sceneType == 'playCategories') {
            this.elements.startButton.style.display = 'block';
        } else if (sceneType.startsWith('userCategories')) {
            this.elements.deleteCategoryButton.style.display = 'block';
        }
        
        this.elements.categoriesDisplay.scrollTop = 0;

        // Explicitly update scroll button states after display is updated
        this.updateScrollButtonStates();
    }

    /**
     * Update the scroll button states based on current scroll position
     */
    updateScrollButtonStates() {
        // If there are no categories or buttons aren't displayed, nothing to do
        if (this.elements.scrollButtonDown.style.display === 'none') return;
        
        const containerHeight = this.elements.categoriesDisplay.clientHeight;
        const scrollHeight = this.elements.categoriesDisplay.scrollHeight;
        const scrollTop = this.elements.categoriesDisplay.scrollTop;
        
        // Update top scroll button state
        this.elements.scrollButtonUp.disabled = (scrollTop <= 0);
        
        // Update bottom scroll button state - enable only if there's more content to scroll to
        this.elements.scrollButtonDown.disabled = (scrollTop + containerHeight >= scrollHeight - 5); // 5px buffer
    }

    /**
     * Create a category row element
     * @param {string} categoryString - Category data string
     * @param {number} index - Index of the category
     * @returns {HTMLElement} - Category row element
     */
    createCategoryRow(categoryString, index) {
        const parts = categoryString.split(':');
        const code = parts[0];
        const creator = parts[1];
        const title = parts[2];
        const plays = parts[3];
        const highScore = parts[4];
        const timestamp = parts.length > 8 ? parts[8] : null;

        const formattedTime = formatRelativeTime(timestamp);

        const row = document.createElement('div');
        row.className = 'list-row';
        row.dataset.categoryIndex = index;

        row.innerHTML = `
            <div class="col-title">${title}</div>
            <div class="col-created">${creator}</div>
            <div class="col-played">${plays}</div>
            <div class="col-hs">${highScore}</div>
            <div class="col-timestamp">${formattedTime}</div>
        `;

        return row;
    }

    /**
     * Update the game display
     * @param {string} timeText - Time text to display
     * @param {number} wordCount - Word count to display
     */
    updateGameDisplay(timeText, wordCount) {
        this.elements.timeDisplay.textContent = timeText;
        this.elements.wordCount.textContent = '✅ ' + wordCount.toString();
    }

    /**
     * Start the game interface
     */
    startGameInterface() {
        // Hide menu screens
        this.elements.startButton.style.display = 'none';
        this.elements.returnToStartButton.style.display = 'none';
        this.elements.categoriesScreen.style.display = 'none';
        this.elements.deleteDataButton.style.display = 'none';
        this.elements.startingScreen.style.display = 'none';
        
        // Show game elements
        this.elements.timeDisplay.textContent = '0:00';
        this.elements.wordCount.textContent = '✅ 0';
        this.elements.timeDisplay.style.display = 'block';
        this.elements.wordCount.style.display = 'block';
        this.elements.keyboard.style.display = 'grid';
        this.elements.keyboardOutput.style.display = 'flex';
    }

    /**
     * Display the end game screen
     * @param {boolean} completed - Whether all words were completed
     * @param {Object} feedbackData - Feedback data to display
     */
    displayEndScreen(completed, feedbackData) {
        // Hide game interface
        this.elements.keyboard.style.display = 'none';
        this.elements.keyboardOutput.style.display = 'none';
        this.elements.timeDisplay.style.display = 'none';
        this.elements.wordCount.style.display = 'none';
        
        // Show end game elements
        if (feedbackData) {
            this.elements.finalScore.textContent = feedbackData.message;
            this.elements.finalScore.style.display = 'block';
            
            if (feedbackData.highScore) {
                this.elements.highScore.innerHTML = parseInt(feedbackData.highScore.score) > 0 ? 
                    "High Score<br>" + "by " + feedbackData.highScore.user + ":" + 
                    "<br>" + feedbackData.highScore.score : 
                    'High Score:<br> 0';
                this.elements.highScore.style.display = 'block';
            }
        }
        
        this.elements.retryButton.style.display = 'block';
        this.elements.returnToStartButton.style.top = '70%';
        this.elements.returnToStartButton.style.display = 'block';
    }

    /**
     * Hide game end elements
     */
    hideGameEndElements() {
        this.elements.returnToStartButton.style.display = 'none';
        this.elements.finalScore.style.display = 'none';
        this.elements.highScore.style.display = 'none';
        this.elements.categoriesScreen.style.display = 'none';
        this.elements.retryButton.style.display = 'none';
        this.elements.returnToStartButton.style.display = 'none';
    }

    /**
     * Display a message in the message bar
     * @param {string} message - Message to display
     * @returns {boolean} - Whether the message is a maintenance message
     */
    displayMessage(message) {
        return displayBarMessage(message, this.elements.formMessage);
    }

    /**
     * Update the opacity of the message bar
     * @param {number} deltaOpacity - Amount to change opacity
     * @returns {number} - New opacity value
     */
    updateMessageOpacity(deltaOpacity) {
        const currentOpacity = parseFloat(this.elements.formMessage.style.opacity);
        if (currentOpacity > 0) {
            const newOpacity = Math.max(0, Math.min(1, currentOpacity - deltaOpacity));
            this.elements.formMessage.style.opacity = newOpacity;
            
            if (newOpacity === 0) {
                this.elements.formMessage.style.display = 'none';
            }
            
            return newOpacity;
        }
        return 0;
    }

    /**
     * Show maintenance overlay
     */
    showMaintenanceOverlay() {
        this.elements.centeringScreen.style.display = 'none';
        this.elements.maintenanceOverlay.style.display = 'flex';
    }

    /**
     * Initialize UI (Not responsible for setting button positions/visibility)
     */
    initialize() {
        // Clear categories display initially
        if (this.elements.categoriesDisplay) {
            this.elements.categoriesDisplay.innerHTML = '';
        }
        
        // Make sure form message opacity is reset
        if (this.elements.formMessage) {
            this.elements.formMessage.style.opacity = 0;
        }
        
        // DO NOT Ensure buttons are properly positioned here - handled by showStartScreen
    }
}