import { isInMaintenanceWindow, isApproachingMaintenance, scheduleMaintenanceWarning } from './utils.js';

/**
 * Manages the maintenance window display and notifications
 */
export class MaintenanceManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.maintenanceOverlay = document.getElementById('maintenanceOverlay');
        this.maintenanceTimerId = null;
        this.warningTimerId = null;
        this.lastWarningTime = 0; // To prevent showing warnings too frequently
    }

    /**
     * Initialize the maintenance manager
     */
    initialize() {
        // Check if we're already in or approaching maintenance window
        const minutesUntil = isApproachingMaintenance();
        
        if (minutesUntil >= 0) {
            // Already in warning period or maintenance window
          //  console.log(`Maintenance is ${minutesUntil > 0 ? 'approaching in ' + minutesUntil + ' minutes' : 'active now'}`);
            this.activateWarningMode();
        } else {
            // Schedule a timer for when we'll reach the warning period
            this.maintenanceTimerId = scheduleMaintenanceWarning(() => {
            //    console.log('Scheduled maintenance warning timer activated');
                this.activateWarningMode();
            });
        }
        
        // Update maintenance overlay immediately if we're in the window
        this.updateMaintenanceMessage();
    }
    
    /**
     * Activate warning mode - showing periodic warnings to users
     */
    activateWarningMode() {
        // Clear any existing timers
        if (this.warningTimerId) {
            clearInterval(this.warningTimerId);
        }
        
        // Set up a timer to check and show warnings every minute
        this.warningTimerId = setInterval(() => {
            const minutesUntil = isApproachingMaintenance();
            
            // Show warning message if approaching maintenance and enough time has passed since last warning
            if (minutesUntil > 0 && Date.now() - this.lastWarningTime > 60000) {
                const minutesString = minutesUntil === 1 ? ' minute' : ' minutes';
                this.uiManager.displayMessage('In ~' + minutesUntil + minutesString + 
                    ', app will close for maintenance for 5 minutes.');
                this.lastWarningTime = Date.now();
            }
            
            // Also update maintenance overlay in case we've entered the window
            this.updateMaintenanceMessage();
        }, 60000); // Check every minute
        
        // Immediately show a first warning
        const minutesUntil = isApproachingMaintenance();
        if (minutesUntil > 0) {
            const minutesString = minutesUntil === 1 ? ' minute' : ' minutes';
            this.uiManager.displayMessage('In ~' + minutesUntil + minutesString + 
                ', app will close for maintenance for 5 minutes.');
            this.lastWarningTime = Date.now();
        }
    }

    /**
     * Check if we're currently in the maintenance window
     * @returns {boolean} - True if we're in the maintenance window
     */
    isMaintenanceTime() {
        const maintenanceState = isInMaintenanceWindow();
        return maintenanceState >= 0 && maintenanceState < 5;
    }

    /**
     * Update the maintenance overlay visibility
     */
    updateMaintenanceMessage() {
        if (this.isMaintenanceTime()) {
            // We're in the maintenance window, show the overlay
            this.maintenanceOverlay.style.display = 'block';
            
            // Disable user interaction with the app
            document.body.style.pointerEvents = 'none';
            this.maintenanceOverlay.style.pointerEvents = 'all';
        } else {
            // Not in maintenance window, hide the overlay
            this.maintenanceOverlay.style.display = 'none';
            
            // Re-enable user interaction
            document.body.style.pointerEvents = 'all';
        }
    }
    
    /**
     * Clean up timers when the manager is destroyed
     */
    destroy() {
        if (this.maintenanceTimerId) {
            clearTimeout(this.maintenanceTimerId);
        }
        if (this.warningTimerId) {
            clearInterval(this.warningTimerId);
        }
    }
}