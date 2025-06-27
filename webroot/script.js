import * as THREE from './three.js/three.module.min.js';
import { Line2 } from './three.js/lines/Line2.js';
import { LineMaterial } from './three.js/lines/LineMaterial.js';
import { LineGeometry } from './three.js/lines/LineGeometry.js';

// Import all modules
import { Scene } from './modules/Scene.js';
import { ParticleSystem } from './modules/ParticleSystem.js';
import { GameState } from './modules/GameState.js';
import { UIManager } from './modules/UIManager.js';
import { MessageHandler } from './modules/MessageHandler.js';
import { MaintenanceManager } from './modules/MaintenanceManager.js';
import { lettersPositions, lettersIndices } from './modules/constants.js';
import { clamp, isApproachingMaintenance } from './modules/utils.js';

// Make THREE and related components available globally
window.THREE = THREE;
window.Line2 = Line2;
window.LineMaterial = LineMaterial;
window.LineGeometry = LineGeometry;

/**
 * Main application class
 */
class App {
    constructor() {
        // Initialize the scene
        this.sceneManager = new Scene();
        const { scene, camera, renderer } = this.sceneManager.initialize();
        
        // Initialize the game state
        this.gameState = new GameState();
        
        // Initialize the UI manager (caches elements)
        this.uiManager = new UIManager(this.gameState);
        
        // Initialize the particle system
        this.particleSystem = new ParticleSystem(scene, camera);
        this.particleSystem.initialize(lettersPositions, lettersIndices);
        
        // Initialize the message handler (sets up listener)
        this.messageHandler = new MessageHandler(this.gameState, this.uiManager, this.particleSystem);
        
        // Initialize the maintenance manager
        this.maintenanceManager = new MaintenanceManager(this.uiManager);
        
        // Set up callbacks and event listeners
        this.setupCallbacks(); // This calls messageHandler.initialize
        this.setupEventListeners(); // This connects UI elements to callbacks
        
        // Start the game loop
        this.startGameLoop();
        
        // setupStartScreen is now called within messageHandler.initialize
        // when initialData is received, ensuring gameState is ready.
    }

    /**
     * Set up message handler callbacks
     */
    setupCallbacks() {
        const callbacks = {
            onInitialDataLoaded: () => {
                // Now that we have user data, setup the start screen correctly
                this.setupStartScreen();
            },
            
            onGameStart: (initialWord) => {
                this.particleSystem.setNewWord(initialWord);
                this.particleSystem.updateParams({
                    xRemapRange: 2.2,
                    yOffset: clamp(1 * this.sceneManager.camera.aspect, 0.4, 2),
                    letterScaling: 4,
                    radiusScaling: 1,
                    currentWordIndex: 0
                });
                this.gameState.particlesAreSetup = true;
            }
        };
        
        // Initialize MessageHandler, passing these callbacks
        this.messageHandler.initialize(callbacks);
        this.maintenanceManager.initialize();
    }

    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        const uiCallbacks = {
            onPlayClick: (sortMethod = 'time', reversed = false) => {
                this.messageHandler.requestCategories(this.gameState.currentCategoriesCursor, sortMethod, reversed);
            },
            
            onCreateCategoryClick: () => {
                // Disable pointer events to prevent multiple clicks
                document.body.style.pointerEvents = 'none';
                
                // Call the message handler to start the category form
                this.messageHandler.startCategoryForm();
            },
            
            onSettingsClick: () => {
                this.messageHandler.requestUserData();
            },
            
            onStartClick: (categoryCode) => {
                this.messageHandler.requestCategoryWords(categoryCode);
            },
            
            onRetryClick: () => {
                const initialWord = this.gameState.startGuessingGame();
                this.uiManager.startGameInterface();
                this.particleSystem.setNewWord(initialWord);
                this.particleSystem.updateParams({
                    xRemapRange: 2.2,
                    yOffset: clamp(1 * this.sceneManager.camera.aspect, 0.4, 2),
                    letterScaling: 4,
                    radiusScaling: 1,
                    currentWordIndex: 0
                });
            },
            
            onReturnToStartClick: () => {
                // Reset display parameters
                this.particleSystem.updateParams({
                    xRemapRange: 2,
                    yOffset: 1 * clamp(this.sceneManager.camera.aspect, 0.9, 1.8),
                    letterScaling: 1.8,
                    radiusScaling: 0
                });
                
                if (this.particleSystem.currentWord != 'Word Trail') {
                    this.setupStartScreen();
                }
            },
            
            onDeleteCategory: (categoryCode) => {
                this.messageHandler.deleteCategory(categoryCode);
            },
            
            onDeleteAllData: () => {
                this.messageHandler.deleteAllUserData();
            },
            
            onCategoriesScrollEnd: (cursor, sortMethod = 'time', reversed = false) => {
                this.messageHandler.requestCategories(cursor, sortMethod, reversed);
            }
        };
        
        this.uiManager.setupEventListeners(uiCallbacks);
    }

    /**
     * Set up the start screen (Called AFTER initialData is received)
     */
    setupStartScreen() {
        this.gameState.gameStarted = false;
        this.gameState.gameFinished = false;
        
        this.particleSystem.setNewWord('Word Trail');
        this.particleSystem.updateParams({
            xRemapRange: 2,
            yOffset: 1 * clamp(this.sceneManager.camera.aspect, 0.9, 1.8),
            letterScaling: 1.8,
            radiusScaling: 0,
            currentWordIndex: 0
        });
        
        this.gameState.particlesAreSetup = true;
        
        // Show the starting screen UI - this now correctly uses gameState.userAllowedToCreate
        this.uiManager.showStartScreen();
    }

    /**
     * Display the end screen
     * @param {boolean} completed - Whether the game was completed
     */
    displayEndScreen(completed) {
        this.gameState.gameFinished = true;
        this.gameState.gameStarted = false;
        
        this.messageHandler.updateCategoryInfo({
            categoryCode: this.gameState.categoryCode,
            newScore: this.gameState.currentWordIndex,
            guessedAll: completed
        });
        
        this.particleSystem.updateParams({
            letterScaling: 1.5,
            yOffset: 1.2 * clamp(this.sceneManager.camera.aspect, 0.9, 1.8),
            xRemapRange: 1,
            radiusScaling: 0,
            isEndScreen: true,
        });
        
        this.particleSystem.setNewWord('SCORE');
    }

    /**
     * Main game loop
     */
    startGameLoop() {
        const update = () => {
            requestAnimationFrame(update);
            
            if (this.gameState.particlesAreSetup) {
                // Handle guess submission
                if (this.gameState.guess != '' && 
                    this.gameState.gameStarted && 
                    this.gameState.currentWordIndex < this.gameState.currentWords.length) {
                    
                    const guessResult = this.gameState.handleGuess();
                    
                    if (guessResult.status === 'correct') {
                        this.particleSystem.updateParams({
                            currentWordIndex: this.gameState.currentWordIndex
                        });
                        this.particleSystem.setNewWord(guessResult.nextWord);
                        this.uiManager.updateGameDisplay(guessResult.time, this.gameState.currentWordIndex);
                    } else if (guessResult.status === 'complete') {
                        this.displayEndScreen(true);
                    } else if (guessResult.status === 'incorrect') {
                        this.displayEndScreen(false);
                    }
                } else {
                    // Get delta time
                    const totalTimeDeltaTime = this.sceneManager.getDeltaTime();
                    // Clamp delta time to prevent large jumps if frames drop
                    const deltaTime = clamp(totalTimeDeltaTime, 0, 0.03);

                    // Update timer if game is running
                    const timerResult = this.gameState.updateTimer(totalTimeDeltaTime);
                    if (timerResult.status === 'timeup') {
                        this.displayEndScreen(false);
                    } else if (timerResult.status === 'running') {
                        this.uiManager.updateGameDisplay(
                            timerResult.time, 
                            timerResult.wordCount
                        );
                    }
                    
                    // Update particles
                    this.particleSystem.update(deltaTime);
                }
                
                // Handle message fade-out and maintenance message
                if (this.maintenanceManager.isMaintenanceTime()) {
                    this.maintenanceManager.updateMaintenanceMessage();
                } else if (parseFloat(this.uiManager.elements.formMessage.style.opacity) > 0) {
                    const delta = clamp(
                        (0.802 - parseFloat(this.uiManager.elements.formMessage.style.opacity)) * 0.02, 
                        0, 
                        0.02
                    );
                    
                    const newOpacity = this.uiManager.updateMessageOpacity(delta);
                    
                    if (newOpacity === 0) {
                        const minutesOffset = isApproachingMaintenance();
                        if (minutesOffset > 0) {
                            const minutesString = Math.round(minutesOffset) == 1 ? ' minute' : ' minutes';
                            this.uiManager.displayMessage('In ~' + Math.round(minutesOffset).toString() + 
                                minutesString + ', app will close for maintenance for 5 minutes.');
                        }
                    }
                }
            }
            
            // Render the scene
            this.sceneManager.render();
        };
        
        update();
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
}


// Add search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('categorySearch');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchInput && clearSearch) {
        searchInput.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase();
            filterCategories(searchValue);
            
            // Show/hide clear button
            if (searchValue.length > 0) {
                clearSearch.classList.add('visible');
            } else {
                clearSearch.classList.remove('visible');
            }
        });
        
        clearSearch.addEventListener('click', function() {
            searchInput.value = '';
            filterCategories('');
            this.classList.remove('visible');
            searchInput.focus();
        });
    }
});

// Function to filter categories by search term
function filterCategories(searchTerm) {
    const categoryRows = document.querySelectorAll('.list-row');
    let hasVisibleCategory = false;
    
    categoryRows.forEach(row => {
        const title = row.querySelector('.col-title').textContent.toLowerCase();
        const creator = row.querySelector('.col-created').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || creator.includes(searchTerm)) {
            row.style.display = 'grid';
            hasVisibleCategory = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show message when no results found
    const existingMessage = document.getElementById('no-results-message');
    if (!hasVisibleCategory && searchTerm) {
        if (!existingMessage) {
            const noResults = document.createElement('div');
            noResults.id = 'no-results-message';
            noResults.className = 'emptyElement';
            noResults.innerHTML = '<span class="emptyText">No matching categories found.</span>';
            document.getElementById('rows-wrapper').appendChild(noResults);
        }
    } else if (existingMessage) {
        existingMessage.remove();
    }
    
    // Update scroll buttons state
    if (typeof updateScrollButtonStates === 'function') {
        updateScrollButtonStates();
    }
}

// Instantiate the application immediately
new App();