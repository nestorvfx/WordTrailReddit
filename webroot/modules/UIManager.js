import { displayBarMessage } from "./utils.js";

/**
 * Utility function to format timestamps into relative time
 * @param {number|string} timestamp - Unix timestamp
 * @returns {string} - Formatted relative time string
 */
function formatRelativeTime(timestamp) {
  if (!timestamp || isNaN(parseInt(timestamp))) {
    return "";
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
    return "";
  }
}

/**
 * Class that manages the user interface elements and interactions
 */
export class UIManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.elements = {};
    this.typeOfConfirm = "category";
    this.currentSortMethod = "time";
    this._lastRequestSource = null; // Track the source of the last categories request
    this.initUIElements();

    // Clear categories display initially
    if (this.elements.categoriesDisplay) {
      this.elements.categoriesDisplay.innerHTML = "";
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
    this.elements.centeringScreen = document.getElementById("centeringScreen");
    this.elements.maintenanceOverlay =
      document.getElementById("maintenanceOverlay");
    this.elements.startingScreen = document.getElementById("starting-screen");
    this.elements.categoriesScreen =
      document.getElementById("categoriesScreen");
    this.elements.deleteConfirmationScreen = document.getElementById(
      "deleteConfirmationScreen",
    );

    // Intro modal elements
    this.elements.introModal = document.getElementById("introModal");
    this.elements.introContent = document.getElementById("introContent");
    this.elements.introCloseButton =
      document.getElementById("introCloseButton");
    this.elements.introText = document.getElementById("introText");

    // Buttons
    this.elements.playButton = document.getElementById("play-button");
    this.elements.createCategoryButton = document.getElementById(
      "create-category-button",
    );
    this.elements.settingsButton = document.getElementById("settingsButton");
    this.elements.introButton = document.getElementById("intro-button");
    this.elements.startButton = document.getElementById("startButton");
    this.elements.returnToStartButton = document.getElementById(
      "returnToStartButton",
    );
    this.elements.retryButton = document.getElementById("retryButton");
    this.elements.deleteCategoryButton = document.getElementById(
      "deleteCategoryButton",
    );
    this.elements.deleteDataButton =
      document.getElementById("deleteDataButton");
    this.elements.deleteConfirmButton =
      document.getElementById("confirmButton");
    this.elements.deleteCancelButton = document.getElementById("cancelButton");
    this.elements.scrollButtonUp = document.getElementById("scrollButtonUp");
    this.elements.scrollButtonDown =
      document.getElementById("scrollButtonDown");

    // Display elements
    this.elements.timeDisplay = document.getElementById("timeDisplay");
    this.elements.wordCount = document.getElementById("wordCount");
    this.elements.finalScore = document.getElementById("final-score");
    this.elements.highScore = document.getElementById("highScore");
    this.elements.formMessage = document.getElementById("formMessage");
    this.elements.deleteText = document.getElementById("deleteText");
    this.elements.categoriesDisplay = document.getElementById("rows-wrapper");

    // Keyboard elements
    this.elements.keyboard = document.getElementById("keyboard");
    this.elements.keyboardOutput = document.getElementById("output");
    this.elements.keys = document.querySelectorAll(".key");

    // Sorting elements
    this.elements.sortButton = document.getElementById("sortButton");
    this.elements.sortDropdown = document.getElementById("sortDropdown");
    this.elements.currentSortText = document.getElementById("currentSort");
    this.elements.sortOptions = document.querySelectorAll(".sort-option");
    this.elements.reverseSort = document.getElementById("reverseSort");

    // Add loading spinner to cached elements
    this.elements.categoriesLoading =
      document.getElementById("categoriesLoading");
  }

  /**
   * Show loading spinner for category fetching
   */
  showCategoriesLoading() {
    if (this.elements.categoriesLoading) {
      this.elements.categoriesLoading.style.display = "flex"; // Changed to flex for centering

      // Add loading class to down scroll button to indicate it's temporarily disabled
      if (this.elements.scrollButtonDown) {
        this.elements.scrollButtonDown.classList.add("loading");
      }
    }
  }

  /**
   * Hide loading spinner for category fetching
   */
  hideCategoriesLoading() {
    if (this.elements.categoriesLoading) {
      this.elements.categoriesLoading.style.display = "none";

      // Remove loading class from down scroll button
      if (this.elements.scrollButtonDown) {
        this.elements.scrollButtonDown.classList.remove("loading");
      }
    }
  }

  /**
   * Attach event listeners to UI elements using event delegation
   * @param {Object} callbacks - Callback functions for different events
   */
  setupEventListeners(callbacks) {
    this.callbacks = callbacks;

    // Main UI click delegation
    document.addEventListener("click", (event) => {
      const target = event.target;

      // Find the clicked element or its closest button parent
      const buttonElement = target.closest("button") || target;
      const buttonId = buttonElement.id;

      // Handle specific button clicks based on ID
      switch (buttonId) {
        case "play-button":
          // Reset categories state
          this.gameState.currentCategoriesCursor = 0;
          this.gameState.allCategoriesReceived = false;
          this.gameState.categoriesList = [];

          // Set source flag for this request
          this._lastRequestSource = "playButton";

          if (callbacks.onPlayClick) callbacks.onPlayClick();
          break;

        case "create-category-button":
          if (this.gameState.userAllowedToCreate) {
            if (callbacks.onCreateCategoryClick)
              callbacks.onCreateCategoryClick();
          }
          break;

        case "settingsButton":
          this.gameState.currentCategoriesCursor = 0;
          this.gameState.allCategoriesReceived = true;
          this.gameState.categoriesList = [];

          if (callbacks.onSettingsClick) callbacks.onSettingsClick();
          break;

        case "intro-button":
          this.showIntroModal();
          break;

        case "introCloseButton":
          this.hideIntroModal();
          break;

        case "startButton":
          if (this.elements.scrollButtonDown.style.display != "none") {
            const categoryData =
              this.gameState.categoriesList[this.gameState.selectedCategory];
            this.gameState.setCategoryFromString(categoryData);

            if (callbacks.onStartClick)
              callbacks.onStartClick(this.gameState.categoryCode);
          }
          break;

        case "deleteCategoryButton":
          if (this.elements.scrollButtonDown.style.display != "none") {
            this.elements.deleteText.textContent =
              "Confirm deleting " + this.gameState.categoryTitle + " category?";
            this.typeOfConfirm = "category";
            this.elements.deleteConfirmationScreen.style.display = "flex";
          }
          break;

        case "returnToStartButton":
          this.showStartScreen();

          if (callbacks.onReturnToStartClick) callbacks.onReturnToStartClick();
          break;

        case "deleteDataButton":
          this.elements.deleteText.textContent =
            "Confirm deleting all of your Reddit info within Word Trail Game itself + category posts created?";
          this.typeOfConfirm = "allData";
          this.elements.deleteConfirmationScreen.style.display = "flex";
          break;

        case "confirmButton":
          if (this.typeOfConfirm == "allData") {
            if (callbacks.onDeleteAllData) callbacks.onDeleteAllData();
          } else if (this.typeOfConfirm == "category") {
            const categoryData =
              this.gameState.categoriesList[this.gameState.selectedCategory];
            this.gameState.setCategoryFromString(categoryData);

            if (callbacks.onDeleteCategory)
              callbacks.onDeleteCategory(this.gameState.categoryCode);
          }
          document.body.style.pointerEvents = "none";
          break;

        case "cancelButton":
          this.elements.deleteConfirmationScreen.style.display = "none";
          break;

        case "retryButton":
          this.hideGameEndElements();

          // Shuffle words
          this.gameState.currentWords = this.gameState.currentWords.sort(
            () => Math.random() - 0.5,
          );

          if (callbacks.onRetryClick) callbacks.onRetryClick();
          break;

        case "scrollButtonUp":
          const firstUpElement =
            this.elements.categoriesDisplay.querySelector(".list-row");
          if (firstUpElement) {
            const elementHeightUp =
              firstUpElement.offsetHeight +
              parseFloat(getComputedStyle(firstUpElement).marginBottom);
            this.elements.categoriesDisplay.scrollBy({
              top: -elementHeightUp,
              behavior: "smooth",
            });
          }
          break;

        case "scrollButtonDown":
          const firstDownElement =
            this.elements.categoriesDisplay.querySelector(".list-row");
          if (firstDownElement) {
            const elementHeightDown =
              firstDownElement.offsetHeight +
              parseFloat(getComputedStyle(firstDownElement).marginBottom);
            this.elements.categoriesDisplay.scrollBy({
              top: elementHeightDown,
              behavior: "smooth",
            });
          }
          break;
      }

      // Handle keyboard click events separately (since these don't have IDs but have classes)
      if (buttonElement.classList.contains("key")) {
        this.handleKeyboardClick(buttonElement);
      }
    });

    // Categories scroll event with debouncing
    let scrollTimeout = null;
    this.elements.categoriesDisplay.addEventListener("scroll", () => {
      // Update scroll button states whenever the user scrolls
      this.updateScrollButtonStates();

      // Calculate scroll position
      const scrolled =
        this.elements.categoriesDisplay.scrollTop +
        this.elements.categoriesDisplay.clientHeight;
      const height = this.elements.categoriesDisplay.scrollHeight;

      // Only trigger the callback if bottom reached and more categories to load
      if (scrolled >= height - 10 && !this.gameState.allCategoriesReceived) {
        // Clear any existing timeout to prevent duplicate requests
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Set a new timeout to debounce the scroll event
        scrollTimeout = setTimeout(() => {
          if (callbacks.onCategoriesScrollEnd) {
            // Pass the current sort method AND the reversed state
            callbacks.onCategoriesScrollEnd(
              this.gameState.currentCategoriesCursor,
              this.currentSortMethod,
              this.currentSortReversed,
            );
          }
          scrollTimeout = null;
        }, 300); // 300ms debounce delay
      }
    });

    // Add sorting functionality
    this.setupSortingListeners();

    // For sort options, update to pass the sort method to the backend when selected
    this.elements.sortOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const sortMethod = option.dataset.sort;

        // *** KEY FIX: Skip if the selected sort method is already active ***
        if (sortMethod === this.currentSortMethod) {
          // Just close the dropdown without reloading categories
          this.elements.sortDropdown.classList.remove("show");
          this.elements.sortButton.classList.remove("active");
          return;
        }

        const prevSortMethod = this.currentSortMethod;
        this.currentSortMethod = sortMethod;

        // Update UI
        this.elements.currentSortText.textContent =
          sortMethod === "time"
            ? "Newest"
            : sortMethod === "trending"
              ? "Trending"
              : sortMethod === "plays"
                ? "Plays"
                : "High Score";

        // Remove active class from all options
        this.elements.sortOptions.forEach((o) => o.classList.remove("active"));
        // Add active class to selected option
        option.classList.add("active");

        // Hide dropdown
        this.elements.sortDropdown.classList.remove("show");
        this.elements.sortButton.classList.remove("active");

        // Reset categories state and request with new sort method
        this.gameState.currentCategoriesCursor = 0;
        this.gameState.allCategoriesReceived = false;
        this.gameState.categoriesList = [];
        this.elements.categoriesDisplay.innerHTML = "";

        // Request categories with the new sort method and current direction
        if (callbacks.onPlayClick) {
          // Set source flag for this request
          this._lastRequestSource = "sortChange";
          callbacks.onPlayClick(sortMethod, this.currentSortReversed);
        }
      });
    });
  }

  /**
   * Setup listeners for the sorting dropdown
   */
  setupSortingListeners() {
    // Toggle dropdown visibility when sort button is clicked
    this.elements.sortButton.addEventListener("click", () => {
      this.elements.sortButton.classList.toggle("active");
      this.elements.sortDropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#sortContainer")) {
        this.elements.sortButton.classList.remove("active");
        this.elements.sortDropdown.classList.remove("show");
      }
    });

    // Set the initial active sort option to match the default sort method
    this.elements.sortOptions.forEach((opt) => {
      if (opt.dataset.sort === this.currentSortMethod) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });

    // Add reverse sort button functionality
    this.currentSortReversed = false;
    if (this.elements.reverseSort) {
      this.elements.reverseSort.addEventListener("click", () => {
        this.currentSortReversed = !this.currentSortReversed;

        // Update UI to show reversed state
        if (this.currentSortReversed) {
          this.elements.reverseSort.classList.add("reversed");
          this.elements.reverseSort.title = "Normal sort order";
        } else {
          this.elements.reverseSort.classList.remove("reversed");
          this.elements.reverseSort.title = "Reverse sort order";
        }

        // Reset categories state and request with new sort direction
        this.gameState.currentCategoriesCursor = 0;
        this.gameState.allCategoriesReceived = false;
        this.gameState.categoriesList = [];
        this.elements.categoriesDisplay.innerHTML = "";

        // Request categories with current sort method and new direction
        if (this.callbacks.onPlayClick) {
          // Set source flag for this request
          this._lastRequestSource = "reverseButton";
          this.callbacks.onPlayClick(
            this.currentSortMethod,
            this.currentSortReversed,
          );
        }
      });
    }

    // Add event listener to close intro modal when clicking outside of it
    if (this.elements.introModal) {
      this.elements.introModal.addEventListener("click", (event) => {
        // Only close if clicking on the modal backdrop, not the content
        if (event.target === this.elements.introModal) {
          this.hideIntroModal();
        }
      });
    }
  }

  /**
   * Sort the categories based on the current sorting method
   */
  sortCategories() {
    if (
      !this.gameState.categoriesList ||
      this.gameState.categoriesList.length === 0
    ) {
      return;
    }

    switch (this.currentSortMethod) {
      case "time":
        // Sort by timestamp (newest first)
        this.gameState.categoriesList.sort((a, b) => {
          const partsA = a.split(":");
          const partsB = b.split(":");
          const timestampA = partsA.length > 8 ? parseInt(partsA[8]) : 0;
          const timestampB = partsB.length > 8 ? parseInt(partsB[8]) : 0;
          return this.currentSortReversed
            ? timestampA - timestampB
            : timestampB - timestampA; // Descending (newest first)
        });
        break;

      case "plays":
        // Sort by number of plays (highest first)
        this.gameState.categoriesList.sort((a, b) => {
          const playsA = parseInt(a.split(":")[3]) || 0;
          const playsB = parseInt(b.split(":")[3]) || 0;
          return this.currentSortReversed ? playsA - playsB : playsB - playsA; // Descending
        });
        break;

      case "score":
        // Sort by high score (highest first)
        this.gameState.categoriesList.sort((a, b) => {
          const scoreA = parseInt(a.split(":")[4]) || 0;
          const scoreB = parseInt(b.split(":")[4]) || 0;
          return this.currentSortReversed ? scoreA - scoreB : scoreB - scoreA; // Descending
        });
        break;
    }
  }

  /**
   * Render the categories list after sorting
   * @param {string} sceneType - The type of scene to display
   */
  renderCategoriesList(sceneType) {
    // Clear current list
    this.elements.categoriesDisplay.innerHTML = "";

    // Add sorted categories
    for (let i = 0; i < this.gameState.categoriesList.length; i++) {
      const categoryItem = this.createCategoryRow(
        this.gameState.categoriesList[i],
        i,
      );
      this.elements.categoriesDisplay.appendChild(categoryItem);
    }

    // Reset scroll position
    this.elements.categoriesDisplay.scrollTop = 0;
    this.updateScrollButtonStates();

    // Auto-select the first category after rendering the full list
    if (
      sceneType === "initialPlayCategories" ||
      this.gameState.selectedCategory === null
    ) {
      this._autoSelectFirstCategory();
    }
  }

  /**
   * Handle keyboard key clicks
   * @param {HTMLElement} key - The key element that was clicked
   */
  handleKeyboardClick(key) {
    if (key.classList.contains("space")) {
      if (this.gameState.currentlyTyped.length < 12) {
        const letter = document.createElement("div");
        letter.className = "output-item";
        letter.textContent = " ";
        this.gameState.currentlyTyped += " ";
        this.elements.keyboardOutput.appendChild(letter);
      }
    } else if (key.classList.contains("submit")) {
      this.gameState.guess = this.gameState.currentlyTyped;
      this.gameState.currentlyTyped = "";
      this.elements.keyboardOutput.innerHTML = "";
    } else if (key.classList.contains("backspace")) {
      this.gameState.currentlyTyped = this.gameState.currentlyTyped.substring(
        0,
        this.gameState.currentlyTyped.length - 1,
      );
      const lastChild = this.elements.keyboardOutput.lastChild;
      if (lastChild) this.elements.keyboardOutput.removeChild(lastChild);
    } else {
      if (this.gameState.currentlyTyped.length < 12) {
        const letter = document.createElement("div");
        letter.className = "output-item";
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
    this.elements.categoriesScreen.style.display = "none";
    this.elements.deleteConfirmationScreen.style.display = "none";
    this.elements.introModal.style.display = "none";
    this.elements.retryButton.style.display = "none";
    this.elements.finalScore.style.display = "none";
    this.elements.highScore.style.display = "none";
    this.elements.timeDisplay.style.display = "none";
    this.elements.wordCount.style.display = "none";
    this.elements.keyboard.style.display = "none";
    this.elements.keyboardOutput.style.display = "none";
    this.elements.startButton.style.display = "none";
    this.elements.deleteCategoryButton.style.display = "none";
    this.elements.deleteDataButton.style.display = "none";
    this.elements.returnToStartButton.style.display = "none";

    // Always display the main start screen container
    this.elements.startingScreen.style.display = "flex";

    // Always show the intro button
    this.elements.introButton.style.display = "flex";

    // Set visibility and position based on gameState.userAllowedToCreate
    if (this.gameState.userAllowedToCreate) {
      this.elements.createCategoryButton.style.display = "block";
      this.elements.settingsButton.style.top = "75%";
    } else {
      this.elements.createCategoryButton.style.display = "none";
      this.elements.settingsButton.style.top = "60%";
    }
    this.elements.settingsButton.style.display = "block"; // Always show settings
    this.elements.playButton.style.display = "block"; // Always show play
  }

  /**
   * Show the categories selection screen with improved structure
   * @param {string} categoriesData - Categories data string
   * @param {string} sceneType - Type of categories screen to show ('initialPlayCategories', 'playCategories', 'userCategories', 'userCategoriesRemoveOne')
   * @param {string} source - Source of the display call ('playButton', 'reverseButton', 'sortChange', 'other')
   */
  displayCategories(categoriesData, sceneType, source = "other") {
    // If no source specified, use the last request source and clear it
    if (source === "other" && this._lastRequestSource) {
      source = this._lastRequestSource;
      this._lastRequestSource = null; // Clear the flag
    }

    // Step 1: Process incoming data based on scene type (updates gameState.categoriesList)
    this._processCategoriesData(categoriesData, sceneType);

    // Step 2: If we're appending categories (scroll pagination), handle separately and exit
    if (sceneType === "playCategories") {
      this._handleCategoryAppend(categoriesData);
      return; // Append logic handles its own rendering and UI updates
    }

    // Step 3: For initial loads or updates (not append), render the full list
    this._renderCategoryList(sceneType); // Pass scene type to _renderCategoryList

    // Step 4: Set up common UI elements visible in both modes
    this._setupCommonCategoryUI();

    // Step 5: Configure mode-specific UI elements (Play vs. Settings)
    if (sceneType.startsWith("play") || sceneType === "initialPlayCategories") {
      this._configurePlayModeUI(source);
    } else if (sceneType.startsWith("user")) {
      this._configureSettingsModeUI();
    }

    // Step 6: Set up interaction handlers and initial scroll state
    this.setupCategoryClickHandler(); // Ensure click handlers are attached
    this.updateScrollButtonStates(); // Set initial state of scroll buttons
  }

  /**
   * Process categories data based on the scene type, updating gameState.categoriesList.
   * @private
   * @param {string} categoriesData - Categories data string
   * @param {string} sceneType - Scene type to display
   */
  _processCategoriesData(categoriesData, sceneType) {
    // Only clear display for initial loads or category removal, not for appends
    if (sceneType !== "playCategories") {
      this.elements.categoriesDisplay.innerHTML = "";
    }

    if (sceneType === "userCategoriesRemoveOne") {
      // Remove a single category (after deletion)
      if (
        this.gameState.selectedCategory >= 0 &&
        this.gameState.selectedCategory < this.gameState.categoriesList.length
      ) {
        this.gameState.categoriesList.splice(
          this.gameState.selectedCategory,
          1,
        );
      }
      // Reset selection as the index is now invalid
      this.gameState.selectedCategory = -1;
    } else if (
      sceneType === "initialPlayCategories" ||
      sceneType === "userCategories"
    ) {
      // Initial load for play or settings view - REPLACE list completely, don't append
      const categories = categoriesData ? categoriesData.split(";") : [];
      const validCategories =
        categories.length > 0 && categories[0] !== "" ? categories : [];

      this.gameState.categoriesList = validCategories;
    }
    // Note: 'playCategories' (append) case is handled in _handleCategoryAppend
  }

  /**
   * Handle append operation for infinite scrolling in Play mode.
   * @private
   * @param {string} categoriesData - New categories data string to append
   */
  _handleCategoryAppend(categoriesData) {
    const newCategories = categoriesData ? categoriesData.split(";") : [];
    // Filter out empty strings that might result from splitting
    const validNewCategories = newCategories.filter((cat) => cat !== "");

    if (validNewCategories.length === 0) {
      // No valid categories to append, mark as all received
      this.gameState.allCategoriesReceived = true;
      return;
    }

    // Get current category codes for deduplication
    const existingCategoryCodes = this.gameState.categoriesList.map(
      (cat) => cat.split(":")[0],
    );

    // Add only new categories that aren't already in the list
    let addedCount = 0;
    for (const category of validNewCategories) {
      const categoryCode = category.split(":")[0];
      if (!existingCategoryCodes.includes(categoryCode)) {
        this.gameState.categoriesList.push(category);
        addedCount++;
      }
    }

    // If using a reversed sort, we need to re-sort the complete list
    // to ensure correct order (important for proper scrolling with reverse sort)
    if (this.currentSortReversed) {
      this.sortCategories();
    }

    // Render the newly added categories
    for (
      let i = this.gameState.categoriesList.length - addedCount;
      i < this.gameState.categoriesList.length;
      i++
    ) {
      const categoryItem = this.createCategoryRow(
        this.gameState.categoriesList[i],
        i,
      );
      this.elements.categoriesDisplay.appendChild(categoryItem);
    }

    // Update scroll buttons state after new content is added
    this.updateScrollButtonStates();

    // Hide loading spinner after appending is complete
    this.hideCategoriesLoading();
  }

  /**
   * Sorts and renders the current category list or the empty state message.
   * @private
   * @param {string} sceneType - The type of scene to display
   */
  _renderCategoryList(sceneType) {
    // Always sort before rendering
    this.sortCategories();

    if (this.gameState.categoriesList.length === 0) {
      this._renderEmptyState();
    } else {
      // Render the populated list using the existing method
      this.renderCategoriesList(sceneType); // Pass scene type to renderCategoriesList

      // Ensure buttons are correctly styled for a non-empty list
      this.elements.startButton.style.borderColor = "#ffffff";
      this.elements.deleteCategoryButton.style.borderColor = "#ffffff";
      this.elements.scrollButtonDown.style.display = "flex";
      this.elements.scrollButtonUp.style.display = "flex";
    }
  }

  /**
   * Renders the empty state message when no categories are available.
   * @private
   */
  _renderEmptyState() {
    const emptyElement = document.createElement("div");
    emptyElement.classList.add("emptyElement");

    // Customize message based on whether the user can create categories
    const messageText = this.gameState.userAllowedToCreate
      ? "There are currently no available categories.\n(feel free to create one)"
      : "There are currently no available categories.\n(only moderators can create categories)";

    emptyElement.innerHTML = `<span class="emptyText">${messageText}</span>`;
    this.elements.categoriesDisplay.appendChild(emptyElement);

    // Disable/hide buttons appropriately for empty state
    this.elements.startButton.style.borderColor = "#737373"; // Visually indicate disabled
    this.elements.deleteCategoryButton.style.borderColor = "#737373"; // Visually indicate disabled
    this.elements.scrollButtonDown.style.display = "none";
    this.elements.scrollButtonUp.style.display = "none";
  }

  /**
   * Sets up common UI elements visible in both Play and Settings category views.
   * @private
   */
  _setupCommonCategoryUI() {
    this.elements.returnToStartButton.style.top = "84%";
    this.elements.returnToStartButton.style.display = "block";
    this.elements.categoriesScreen.style.display = "flex";
    this.elements.startingScreen.style.display = "none"; // Hide start screen
    // Ensure search and sort are visible
    // Assuming searchContainer and sortContainer are direct children or handled elsewhere
  }

  /**
   * Configures UI elements specifically for the Play mode category view.
   * @private
   * @param {string} source - Source of the display call ('playButton', 'reverseButton', 'sortChange', 'other')
   */
  _configurePlayModeUI(source = "other") {
    this.elements.startButton.style.display = "block";
    this.elements.deleteCategoryButton.style.display = "none";
    this.elements.deleteDataButton.style.display = "none"; // Ensure this is hidden in play mode

    // Show sorting options in Play mode
    const sortContainer = document.getElementById("sortContainer");
    if (sortContainer) {
      sortContainer.style.display = "flex";
    }

    // Show reverse sort button (flip button) in Play mode
    if (this.elements.reverseSort) {
      this.elements.reverseSort.style.display = "block";
    }

    // Only reset sort method when entering Play mode via Play button, not on reverse/sort changes
    if (source === "playButton") {
      this.currentSortMethod = "time";
      this.currentSortReversed = false;

      // Update UI to reflect the reset
      this.elements.currentSortText.textContent = "Newest";

      // Reset active sort option in dropdown
      this.elements.sortOptions.forEach((opt) => {
        if (opt.dataset.sort === this.currentSortMethod) {
          opt.classList.add("active");
        } else {
          opt.classList.remove("active");
        }
      });

      // Reset reverse sort button
      if (this.elements.reverseSort) {
        this.elements.reverseSort.classList.remove("reversed");
        this.elements.reverseSort.title = "Reverse sort order";
      }

      // Re-sort and re-render the categories list to match the reset sort settings
      if (this.gameState.categoriesList.length > 0) {
        this._renderCategoryList("initialPlayCategories");
      }
    }
  }

  /**
   * Configures UI elements specifically for the Settings mode category view.
   * @private
   */
  _configureSettingsModeUI() {
    this.elements.startButton.style.display = "none";
    this.elements.deleteDataButton.style.display = "block"; // Ensure this is shown in settings mode

    // Hide sorting options in Settings mode
    const sortContainer = document.getElementById("sortContainer");
    if (sortContainer) {
      sortContainer.style.display = "none";
    }

    // Hide reverse sort button (flip button) in Settings mode
    if (this.elements.reverseSort) {
      this.elements.reverseSort.style.display = "none";
    }

    // Show delete button only if user is the creator of the selected category
    if (
      this.gameState.selectedCategory >= 0 &&
      this.gameState.selectedCategory < this.gameState.categoriesList.length
    ) {
      const categoryString =
        this.gameState.categoriesList[this.gameState.selectedCategory];
      const parts = categoryString.split(":");
      const creator = parts[1];

      if (creator === this.gameState.username) {
        this.elements.deleteCategoryButton.style.display = "block";
      } else {
        this.elements.deleteCategoryButton.style.display = "none";
      }
    } else {
      this.elements.deleteCategoryButton.style.display = "none";
    }
  }

  /**
   * Sets up the click handler for category items. Ensures only one handler is active.
   */
  setupCategoryClickHandler() {
    // Remove existing handler first to prevent duplicates
    if (this._categoryClickHandler) {
      this.elements.categoriesDisplay.removeEventListener(
        "click",
        this._categoryClickHandler,
      );
    }

    // Create new click handler and store reference
    this._categoryClickHandler = (event) => {
      const categoryItem = event.target.closest(".list-row");
      if (!categoryItem) return; // Not a category item

      // Remove 'selected' class from the previously selected item
      const prevSelected =
        this.elements.categoriesDisplay.querySelector(".selected");
      if (prevSelected) {
        prevSelected.classList.remove("selected");
      }

      // Add 'selected' class to the clicked item
      categoryItem.classList.add("selected");

      // Update the game state with the selected category index
      const categoryIndex = parseInt(categoryItem.dataset.categoryIndex);
      // Ensure the index is valid before setting category string
      if (
        categoryIndex >= 0 &&
        categoryIndex < this.gameState.categoriesList.length
      ) {
        this.gameState.setCategoryFromString(
          this.gameState.categoriesList[categoryIndex],
        );
        this.gameState.selectedCategory = categoryIndex; // Store index

        // Update delete button visibility in Settings mode
        if (this.elements.startButton.style.display === "none") {
          // We're in Settings mode
          const categoryString = this.gameState.categoriesList[categoryIndex];
          const parts = categoryString.split(":");
          const creator = parts[1];

          if (creator === this.gameState.username) {
            this.elements.deleteCategoryButton.style.display = "block";
          } else {
            this.elements.deleteCategoryButton.style.display = "none";
          }
        }
      } else {
        this.gameState.selectedCategory = -1; // Indicate invalid selection

        // Hide delete button for invalid selection in Settings mode
        if (this.elements.startButton.style.display === "none") {
          // We're in Settings mode
          this.elements.deleteCategoryButton.style.display = "none";
        }
      }
    };

    // Add the new handler
    this.elements.categoriesDisplay.addEventListener(
      "click",
      this._categoryClickHandler,
    );
  }

  /**
   * Update the scroll button states based on current scroll position
   */
  updateScrollButtonStates() {
    // If there are no categories or buttons aren't displayed, nothing to do
    if (this.elements.scrollButtonDown.style.display === "none") return;

    const containerHeight = this.elements.categoriesDisplay.clientHeight;
    const scrollHeight = this.elements.categoriesDisplay.scrollHeight;
    const scrollTop = this.elements.categoriesDisplay.scrollTop;

    // Update top scroll button state
    this.elements.scrollButtonUp.disabled = scrollTop <= 0;

    // Update bottom scroll button state - enable only if there's more content to scroll to
    this.elements.scrollButtonDown.disabled =
      scrollTop + containerHeight >= scrollHeight - 5; // 5px buffer
  }

  /**
   * Create a category row element
   * @param {string} categoryString - Category data string
   * @param {number} index - Index of the category *in the gameState.categoriesList*
   * @returns {HTMLElement} - Category row element
   */
  createCategoryRow(categoryString, index) {
    const parts = categoryString.split(":");
    const code = parts[0];
    const creator = parts[1];
    const title = parts[2];
    const plays = parts[3];
    const highScore = parts[4];
    const timestamp = parts.length > 8 ? parts[8] : null;

    const formattedTime = formatRelativeTime(timestamp);

    const row = document.createElement("div");
    row.className = "list-row";
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
    this.elements.wordCount.textContent = "✅ " + wordCount.toString();
  }

  /**
   * Start the game interface
   */
  startGameInterface() {
    // Hide menu screens
    this.elements.startButton.style.display = "none";
    this.elements.returnToStartButton.style.display = "none";
    this.elements.categoriesScreen.style.display = "none";
    this.elements.deleteDataButton.style.display = "none";
    this.elements.startingScreen.style.display = "none";

    // Show game elements
    this.elements.timeDisplay.textContent = "0:00";
    this.elements.wordCount.textContent = "✅ 0";
    this.elements.timeDisplay.style.display = "block";
    this.elements.wordCount.style.display = "block";
    this.elements.keyboard.style.display = "grid";
    this.elements.keyboardOutput.style.display = "flex";

    // Clear keyboard output when starting new game
    const outputElement = document.getElementById("output");
    if (outputElement) {
      outputElement.innerHTML = "";
      outputElement.style.display = "flex";
    }

    // Reset any existing typed letters
    if (this.gameState) {
      this.gameState.guess = "";
    }
  }

  /**
   * Display the end game screen
   * @param {boolean} completed - Whether all words were completed
   * @param {Object} feedbackData - Feedback data to display
   */
  displayEndScreen(completed, feedbackData) {
    // Hide game interface
    this.elements.keyboard.style.display = "none";
    this.elements.keyboardOutput.style.display = "none";
    this.elements.timeDisplay.style.display = "none";
    this.elements.wordCount.style.display = "none";

    // Show end game elements
    if (feedbackData) {
      this.elements.finalScore.textContent = feedbackData.message;
      this.elements.finalScore.style.display = "block";

      if (feedbackData.highScore) {
        const playerScore = this.gameState.currentWordIndex;
        const highScore = parseInt(feedbackData.highScore.score) || 0;
        const isNewHighScore = playerScore >= highScore && playerScore > 0;

        // Clear any previous high score HTML
        this.elements.highScore.innerHTML = "";

        // Create all elements with proper CSS classes instead of inline styles
        const titleEl = document.createElement("div");
        titleEl.className = "hs-title";

        const scoreEl = document.createElement("div");
        scoreEl.className = "hs-score";

        const userEl = document.createElement("div");
        userEl.className = "hs-user";

        if (isNewHighScore) {
          // New high score achieved
          titleEl.textContent = "New High Score!";
          scoreEl.textContent = playerScore;
          userEl.textContent = `Previous: ${highScore > 0 ? highScore : "0"}`;
          this.elements.highScore.classList.add("new-record");
        } else {
          // Regular high score display
          titleEl.textContent = "High Score";
          scoreEl.textContent = highScore > 0 ? highScore : "0";
          userEl.textContent =
            highScore > 0 ? `by ${feedbackData.highScore.user}` : "";
          this.elements.highScore.classList.remove("new-record");
        }

        // Append elements to high score container
        this.elements.highScore.appendChild(titleEl);
        this.elements.highScore.appendChild(scoreEl);
        this.elements.highScore.appendChild(userEl);

        this.elements.highScore.style.display = "block";
      }
    }

    this.elements.retryButton.style.display = "block";
    this.elements.returnToStartButton.style.top = "70%";
    this.elements.returnToStartButton.style.display = "block";
  }

  /**
   * Hide game end elements
   */
  hideGameEndElements() {
    this.elements.returnToStartButton.style.display = "none";
    this.elements.finalScore.style.display = "none";
    this.elements.highScore.style.display = "none";
    this.elements.categoriesScreen.style.display = "none";
    this.elements.retryButton.style.display = "none";
    this.elements.returnToStartButton.style.display = "none";
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
      const newOpacity = Math.max(
        0,
        Math.min(1, currentOpacity - deltaOpacity),
      );
      this.elements.formMessage.style.opacity = newOpacity;

      if (newOpacity === 0) {
        this.elements.formMessage.style.display = "none";
      }

      return newOpacity;
    }
    return 0;
  }

  /**
   * Show maintenance overlay
   */
  showMaintenanceOverlay() {
    this.elements.centeringScreen.style.display = "none";
    this.elements.maintenanceOverlay.style.display = "flex";
  }

  /**
   * Show the intro modal with appropriate text based on user permissions
   */
  showIntroModal() {
    // Set the intro text based on whether the user can create categories
    const introText = this.gameState.userAllowedToCreate
      ? "Play categories, create your own (up to 10) and set high scores.\n\nEach category gameplay consists of particles and trails displaying certain word(s), which should be guessed using provided keyboard.\n\nEach correct guess gives you 10 extra seconds, where gameplay finishes when you guess incorrectly, timer reaches 60 seconds or you guess everything correctly."
      : "Play categories and set high scores.\n\nEach category gameplay consists of particles and trails displaying certain word(s), which should be guessed using provided keyboard.\n\nEach correct guess gives you 10 extra seconds, where gameplay finishes when you guess incorrectly, timer reaches 60 seconds or you guess everything correctly.";

    this.elements.introText.textContent = introText;
    this.elements.introModal.style.display = "flex";
  }

  /**
   * Hide the intro modal
   */
  hideIntroModal() {
    this.elements.introModal.style.display = "none";
  }

  /**
   * Initialize UI (Not responsible for setting button positions/visibility)
   */
  initialize() {
    // Clear categories display initially
    if (this.elements.categoriesDisplay) {
      this.elements.categoriesDisplay.innerHTML = "";
    }

    // Make sure form message opacity is reset
    if (this.elements.formMessage) {
      this.elements.formMessage.style.opacity = 0;
    }

    // DO NOT Ensure buttons are properly positioned here - handled by showStartScreen
  }

  /**
   * Auto-select the first category if available
   * @private
   */
  _autoSelectFirstCategory() {
    // Only proceed if we have categories and none is currently selected
    if (this.gameState.categoriesList.length > 0) {
      const firstRow =
        this.elements.categoriesDisplay.querySelector(".list-row");

      if (firstRow) {
        // Get the category data from the first row
        const categoryIndex = parseInt(firstRow.dataset.categoryIndex);

        if (!isNaN(categoryIndex) && categoryIndex >= 0) {
          // Update visual selection
          const allRows =
            this.elements.categoriesDisplay.querySelectorAll(".list-row");
          allRows.forEach((row) => row.classList.remove("selected"));
          firstRow.classList.add("selected");

          // Update game state
          this.gameState.selectedCategory = categoryIndex;

          // Parse category data
          const categoryString = this.gameState.categoriesList[categoryIndex];
          if (categoryString) {
            const parts = categoryString.split(":");
            const code = parts[0];
            const creator = parts[1];

            // Set category in game state
            this.gameState.setCategoryFromString(categoryString);
          }
        }
      }
    }
  }
}
