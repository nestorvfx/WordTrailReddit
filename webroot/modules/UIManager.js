import { displayBarMessage } from './utils.js';

/**
 * Class that manages the user interface elements and interactions
 */
export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.elements = {};
        this.typeOfConfirm = 'category';
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
            const maxScroll = this.elements.categoriesDisplay.scrollHeight - 
                this.elements.categoriesDisplay.clientHeight;
                
            if (this.elements.categoriesDisplay.scrollTop >= maxScroll) {
                this.elements.scrollButtonDown.disabled = true;

                if (!this.gameState.allCategoriesReceived && callbacks.onCategoriesScrollEnd) {
                    callbacks.onCategoriesScrollEnd(this.gameState.currentCategoriesCursor);
                }
            } else {
                this.elements.scrollButtonDown.disabled = false;
            }

            if (this.elements.categoriesDisplay.scrollTop <= 0) {
                this.elements.scrollButtonUp.disabled = true;
            } else {
                this.elements.scrollButtonUp.disabled = false;
            }
        });
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

        if (!(this.gameState.categoriesList == '' || this.gameState.categoriesList[0] == '')) {
            const currentLength = this.elements.categoriesDisplay.childElementCount;
            for (let c = currentLength; c < this.gameState.categoriesList.length; c++) {
                const categoryItem = document.createElement("div");
                categoryItem.className = "list-row";
                categoryItem.dataset.categoryIndex = c; // Add data attribute for event delegation
                
                const [cCode, cUser, cTitle, cNOP, cHS, cBH, cPI] = this.gameState.categoriesList[c].split(':');
                
                if (c == 0 && currentLength == 0) {
                    categoryItem.classList.add('selected');
                    this.gameState.selectedCategory = 0;
                }
                
                categoryItem.innerHTML = 
                    "<div class=\"col-title\">" + cTitle + "</div>" +
                    "<div class=\"col-created\">" + cUser + "</div>" +
                    "<div class=\"col-played\">" + cNOP + "</div>" +
                    "<div class=\"col-hs\">" + cHS + "</div>";

                this.elements.categoriesDisplay.appendChild(categoryItem);
            }
            
            // Add delegated event listener for category items
            if (currentLength === 0) {
                this.elements.categoriesDisplay.addEventListener('click', (event) => {
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
                });
            }
            
            // Enable buttons for category selection
            this.elements.startButton.style.borderColor = "#ffffff";
            this.elements.deleteCategoryButton.style.borderColor = "#ffffff";
            this.elements.scrollButtonDown.style.display = 'flex';
            this.elements.scrollButtonUp.style.display = 'flex';
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