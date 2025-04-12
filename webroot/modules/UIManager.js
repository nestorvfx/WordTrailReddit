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

        // Categories scroll event with debouncing
        let scrollTimeout = null;
        this.elements.categoriesDisplay.addEventListener('scroll', () => {
            // Update scroll button states whenever the user scrolls
            this.updateScrollButtonStates();
            
            // Calculate scroll position
            const scrolled = this.elements.categoriesDisplay.scrollTop + this.elements.categoriesDisplay.clientHeight;
            const height = this.elements.categoriesDisplay.scrollHeight;
            
            // Only trigger the callback if bottom reached and more categories to load
            if (scrolled >= height - 10 && 
                !this.gameState.allCategoriesReceived) {
                
                // Clear any existing timeout to prevent duplicate requests
                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }
                
                // Set a new timeout to debounce the scroll event
                scrollTimeout = setTimeout(() => {
                    if (callbacks.onCategoriesScrollEnd) {
                        callbacks.onCategoriesScrollEnd(this.gameState.currentCategoriesCursor, this.currentSortMethod);
                    }
                    scrollTimeout = null;
                }, 300); // 300ms debounce delay
            }
        });

        // Add sorting functionality
        this.setupSortingListeners();
        
        // For sort options, update to pass the sort method to the backend when selected
        this.elements.sortOptions.forEach(option => {
            option.addEventListener('click', () => {
                const sortMethod = option.dataset.sort;
                
                // *** KEY FIX: Skip if the selected sort method is already active ***
                if (sortMethod === this.currentSortMethod) {
                    // Just close the dropdown without reloading categories
                    this.elements.sortDropdown.classList.remove('show');
                    this.elements.sortButton.classList.remove('active');
                    return;
                }
                
                const prevSortMethod = this.currentSortMethod;
                this.currentSortMethod = sortMethod;
                
                console.log(`[SORT] Sort option clicked - changing from '${prevSortMethod}' to '${sortMethod}'`);
                console.log(`[STATE] Before sort change - categoriesList.length: ${this.gameState.categoriesList.length}`);
                
                // Update UI
                this.elements.currentSortText.textContent = 
                    sortMethod === 'time' ? 'Newest' : 
                    sortMethod === 'plays' ? 'Plays' : 'High Score';
                
                // Remove active class from all options
                this.elements.sortOptions.forEach(o => o.classList.remove('active'));
                // Add active class to selected option
                option.classList.add('active');
                
                // Hide dropdown
                this.elements.sortDropdown.classList.remove('show');
                this.elements.sortButton.classList.remove('active');
                
                // Reset categories state and request with new sort method
                this.gameState.currentCategoriesCursor = 0;
                this.gameState.allCategoriesReceived = false;
                this.gameState.categoriesList = [];
                this.elements.categoriesDisplay.innerHTML = '';
                
                console.log(`[SORT] State reset for new sort method - cursor: 0, allCategoriesReceived: false`);
                console.log(`[SORT] categoriesList cleared, DOM list cleared`);
                
                // Request categories with the new sort method
                if (callbacks.onPlayClick) {
                    console.log(`[SORT] Requesting categories with new sort method: ${sortMethod}`);
                    callbacks.onPlayClick(sortMethod);
                }
            });
        });
    }

    /**
     * Setup listeners for the sorting dropdown
     */
    setupSortingListeners() {
        // Toggle dropdown visibility when sort button is clicked
        this.elements.sortButton.addEventListener('click', () => {
            console.log(`[SORT] Sort dropdown toggled`);
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

        // Set the initial active sort option to match the default sort method
        this.elements.sortOptions.forEach(opt => {
            if (opt.dataset.sort === this.currentSortMethod) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        
        console.log(`[SORT] Initial sort method set to: ${this.currentSortMethod}`);
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
        console.log(`[RENDER] renderCategoriesList called`);
        
        // Clear current list
        console.log(`[DOM] Clearing categories display before rendering full list`);
        this.elements.categoriesDisplay.innerHTML = '';
        
        // Add sorted categories
        for (let i = 0; i < this.gameState.categoriesList.length; i++) {
            const categoryItem = this.createCategoryRow(this.gameState.categoriesList[i], i);
            // Add a visual indicator for debugging that this was from a full render
            categoryItem.dataset.renderBatch = 'full';
            categoryItem.dataset.renderIndex = i;
            categoryItem.title = `Full render index ${i}`;
            
            this.elements.categoriesDisplay.appendChild(categoryItem);
        }
        
        console.log(`[DOM] Rendered ${this.gameState.categoriesList.length} category rows`);
        
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
     * Show the categories selection screen with improved structure
     * @param {string} categoriesData - Categories data string
     * @param {string} sceneType - Type of categories screen to show ('initialPlayCategories', 'playCategories', 'userCategories', 'userCategoriesRemoveOne')
     */
    displayCategories(categoriesData, sceneType) {
        console.log(`[DISPLAY] displayCategories called - sceneType: ${sceneType}`);
        console.log(`[STATE] Before display - categoriesList.length: ${this.gameState.categoriesList.length}`);
        
        if (categoriesData) {
            const catCount = categoriesData.split(';').filter(cat => cat !== '').length;
            console.log(`[DATA] categoriesData contains ${catCount} items`);
        } else {
            console.log(`[DATA] categoriesData is empty or null`);
        }

        // Step 1: Process incoming data based on scene type (updates gameState.categoriesList)
        this._processCategoriesData(categoriesData, sceneType);

        // Step 2: If we're appending categories (scroll pagination), handle separately and exit
        if (sceneType === 'playCategories') {
            console.log(`[FLOW] Handling as append operation`);
            this._handleCategoryAppend(categoriesData);
            console.log(`[STATE] After append - categoriesList.length: ${this.gameState.categoriesList.length}`);
            return; // Append logic handles its own rendering and UI updates
        }

        console.log(`[FLOW] Handling as full list operation`);
        
        // Step 3: For initial loads or updates (not append), render the full list
        this._renderCategoryList(); // Sorts and renders the list or empty state

        // Step 4: Set up common UI elements visible in both modes
        this._setupCommonCategoryUI();

        // Step 5: Configure mode-specific UI elements (Play vs. Settings)
        if (sceneType.startsWith('play') || sceneType === 'initialPlayCategories') {
            this._configurePlayModeUI();
        } else if (sceneType.startsWith('user')) {
            this._configureSettingsModeUI();
        }

        // Step 6: Set up interaction handlers and initial scroll state
        this.setupCategoryClickHandler(); // Ensure click handlers are attached
        this.updateScrollButtonStates(); // Set initial state of scroll buttons
        
        console.log(`[STATE] After display - categoriesList.length: ${this.gameState.categoriesList.length}`);
    }

    /**
     * Process categories data based on the scene type, updating gameState.categoriesList.
     * @private
     * @param {string} categoriesData - Categories data string
     * @param {string} sceneType - Scene type to display
     */
    _processCategoriesData(categoriesData, sceneType) {
        console.log(`[PROCESS] _processCategoriesData - sceneType: ${sceneType}`);
        console.log(`[STATE] Before processing - categoriesList.length: ${this.gameState.categoriesList.length}`);
        
        // Only clear display for initial loads or category removal, not for appends
        if (sceneType !== 'playCategories') {
            console.log(`[DOM] Clearing category display (not an append operation)`);
            this.elements.categoriesDisplay.innerHTML = '';
        }

        if (sceneType === 'userCategoriesRemoveOne') {
            console.log(`[PROCESS] Removing single category at index: ${this.gameState.selectedCategory}`);
            // Remove a single category (after deletion)
            if (this.gameState.selectedCategory >= 0 && this.gameState.selectedCategory < this.gameState.categoriesList.length) {
                this.gameState.categoriesList.splice(this.gameState.selectedCategory, 1);
                console.log(`[STATE] Category removed - new categoriesList.length: ${this.gameState.categoriesList.length}`);
            }
            // Reset selection as the index is now invalid
            this.gameState.selectedCategory = -1;
        }
        else if (sceneType === 'initialPlayCategories' || sceneType === 'userCategories') {
            console.log(`[PROCESS] Initial load or user categories - REPLACING list`);
            // Initial load for play or settings view - REPLACE list completely, don't append
            const categories = categoriesData ? categoriesData.split(';') : [];
            const validCategories = categories.length > 0 && categories[0] !== '' ? categories : [];
            console.log(`[DATA] Parsed ${validCategories.length} valid categories from data`);
            
            this.gameState.categoriesList = validCategories;
            console.log(`[STATE] List replaced - new categoriesList.length: ${this.gameState.categoriesList.length}`);
        }
        // Note: 'playCategories' (append) case is handled in _handleCategoryAppend
        
        console.log(`[STATE] After processing - categoriesList.length: ${this.gameState.categoriesList.length}`);
    }

    /**
     * Handle append operation for infinite scrolling in Play mode.
     * @private
     * @param {string} categoriesData - New categories data string to append
     */
    _handleCategoryAppend(categoriesData) {
        console.log(`[APPEND] _handleCategoryAppend called`);
        console.log(`[STATE] Before append - categoriesList.length: ${this.gameState.categoriesList.length}`);
        
        const newCategories = categoriesData ? categoriesData.split(';') : [];
        // Filter out empty strings that might result from splitting
        const validNewCategories = newCategories.filter(cat => cat !== '');
        console.log(`[DATA] Found ${validNewCategories.length} valid new categories to append`);

        if (validNewCategories.length === 0) {
            // No more categories received, mark as all received
            this.gameState.allCategoriesReceived = true;
            console.log(`[APPEND] No valid categories to append - marking allCategoriesReceived: true`);
            this.updateScrollButtonStates(); // Update buttons as we might be at the end
            return; // No categories to append
        }

        // Get current category codes for deduplication
        const existingCodes = this.gameState.categoriesList.map(cat => cat.split(':')[0]);
        
        // Filter out any categories that are already in the list
        const uniqueNewCategories = validNewCategories.filter(cat => {
            const code = cat.split(':')[0];
            return !existingCodes.includes(code);
        });
        
        if (uniqueNewCategories.length === 0) {
            // All categories were duplicates, mark as all received
            this.gameState.allCategoriesReceived = true;
            this.updateScrollButtonStates();
            return;
        }

        // Get starting index for new items
        const startIndex = this.gameState.categoriesList.length;
        console.log(`[APPEND] Starting index for new items: ${startIndex}`);

        // Add new categories to our data array
        this.gameState.categoriesList.push(...uniqueNewCategories);
        console.log(`[STATE] After pushing new categories - categoriesList.length: ${this.gameState.categoriesList.length}`);

        // Create and append only the new category rows
        for (let i = 0; i < uniqueNewCategories.length; i++) {
            const categoryItem = this.createCategoryRow(uniqueNewCategories[i], startIndex + i);
            // Add a visual indicator for debugging
            categoryItem.dataset.appendBatch = this.gameState.currentCategoriesCursor;
            categoryItem.dataset.appendIndex = i;
            categoryItem.title = `Appended in batch ${this.gameState.currentCategoriesCursor}, index ${i}`;
            
            this.elements.categoriesDisplay.appendChild(categoryItem);
            console.log(`[DOM] Appended row ${i} with internal index ${startIndex + i}`);
        }

        // Update UI state after appending
        this.updateScrollButtonStates();
        console.log(`[STATE] After append complete - categoriesList.length: ${this.gameState.categoriesList.length}`);
    }

    /**
     * Sorts and renders the current category list or the empty state message.
     * @private
     */
    _renderCategoryList() {
        console.log(`[RENDER] _renderCategoryList called with sort method: ${this.currentSortMethod}`);
        console.log(`[STATE] Before sort - categoriesList.length: ${this.gameState.categoriesList.length}`);
        
        // Always sort before rendering
        this.sortCategories();
        console.log(`[SORT] Categories sorted by ${this.currentSortMethod}`);

        if (this.gameState.categoriesList.length === 0) {
            console.log(`[RENDER] Rendering empty state`);
            this._renderEmptyState();
        } else {
            // Render the populated list using the existing method
            console.log(`[RENDER] Rendering ${this.gameState.categoriesList.length} category items`);
            this.renderCategoriesList(); // This method clears and adds all rows

            // Ensure buttons are correctly styled for a non-empty list
            this.elements.startButton.style.borderColor = "#ffffff";
            this.elements.deleteCategoryButton.style.borderColor = "#ffffff";
            this.elements.scrollButtonDown.style.display = 'flex';
            this.elements.scrollButtonUp.style.display = 'flex';
        }
        
        console.log(`[STATE] After render - categoriesList.length: ${this.gameState.categoriesList.length}`);
    }

    /**
     * Renders the empty state message when no categories are available.
     * @private
     */
    _renderEmptyState() {
        const emptyElement = document.createElement('div');
        emptyElement.classList.add('emptyElement');
        emptyElement.innerHTML =
            "<span class=\"emptyText\">There are currently no available categories.\n" +
            "(feel free to create one) </span> ";
        this.elements.categoriesDisplay.appendChild(emptyElement);

        // Disable/hide buttons appropriately for empty state
        this.elements.startButton.style.borderColor = "#737373"; // Visually indicate disabled
        this.elements.deleteCategoryButton.style.borderColor = "#737373"; // Visually indicate disabled
        this.elements.scrollButtonDown.style.display = 'none';
        this.elements.scrollButtonUp.style.display = 'none';
    }

    /**
     * Sets up common UI elements visible in both Play and Settings category views.
     * @private
     */
    _setupCommonCategoryUI() {
        this.elements.returnToStartButton.style.top = '84%';
        this.elements.returnToStartButton.style.display = 'block';
        this.elements.categoriesScreen.style.display = 'flex';
        this.elements.startingScreen.style.display = 'none'; // Hide start screen
        // Ensure search and sort are visible
        // Assuming searchContainer and sortContainer are direct children or handled elsewhere
    }

    /**
     * Configures UI elements specifically for the Play mode category view.
     * @private
     */
    _configurePlayModeUI() {
        this.elements.startButton.style.display = 'block';
        this.elements.deleteCategoryButton.style.display = 'none';
        this.elements.deleteDataButton.style.display = 'none'; // Ensure this is hidden in play mode
    }

    /**
     * Configures UI elements specifically for the Settings mode category view.
     * @private
     */
    _configureSettingsModeUI() {
        this.elements.startButton.style.display = 'none';
        this.elements.deleteCategoryButton.style.display = 'block';
        this.elements.deleteDataButton.style.display = 'block'; // Ensure this is shown in settings mode
    }


    /**
     * Sets up the click handler for category items. Ensures only one handler is active.
     */
    setupCategoryClickHandler() {
        // Remove existing handler first to prevent duplicates
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

            // Update the game state with the selected category index
            const categoryIndex = parseInt(categoryItem.dataset.categoryIndex);
            // Ensure the index is valid before setting category string
            if (categoryIndex >= 0 && categoryIndex < this.gameState.categoriesList.length) {
                this.gameState.setCategoryFromString(this.gameState.categoriesList[categoryIndex]);
                this.gameState.selectedCategory = categoryIndex; // Store index
            } else {
                console.error("Invalid category index clicked:", categoryIndex);
                this.gameState.selectedCategory = -1; // Indicate invalid selection
            }
        };

        // Add the new handler
        this.elements.categoriesDisplay.addEventListener('click', this._categoryClickHandler);
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
     * @param {number} index - Index of the category *in the gameState.categoriesList*
     * @returns {HTMLElement} - Category row element
     */
    createCategoryRow(categoryString, index) {
        // Log the full category string for debugging
        console.log(`[DEBUG_CATEGORY] Creating row for category string: ${categoryString}`);
        
        // ... existing code to parse categoryString ...
        const parts = categoryString.split(':');
        const code = parts[0];
        const creator = parts[1];
        const title = parts[2];
        const plays = parts[3];
        const highScore = parts[4];
        const timestamp = parts.length > 8 ? parts[8] : null;
        
        console.log(`[DEBUG_CATEGORY] Parsed category parts for row ${index}:`);
        console.log(`  Code: ${code}`);
        console.log(`  Creator: ${creator}`);
        console.log(`  Title: ${title}`);
        console.log(`  Plays: ${plays}`);
        console.log(`  HighScore: ${highScore}`);
        console.log(`  Timestamp: ${timestamp}`);

        const formattedTime = formatRelativeTime(timestamp);

        const row = document.createElement('div');
        row.className = 'list-row';
        // Set the data attribute to the correct index within the gameState.categoriesList
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