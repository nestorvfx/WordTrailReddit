import { isApproachingMaintenance, isInMaintenanceWindow } from './utils.js';

/**
 * Class that manages the maintenance state and notifications
 */
export class MaintenanceManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.maintenanceTime = false;
        this.maintenanceCheckInterval = null;
    }

    /**
     * Initialize maintenance checks
     */
    initialize() {
        this.checkMaintenanceState();
        this.setupMaintenanceSchedule();
    }

    /**
     * Check if we're in a maintenance window
     */
    checkMaintenanceState() {
        const minutesBeforeMaintenance = isApproachingMaintenance();
        
        if (minutesBeforeMaintenance > 0) {
            this.maintenanceTime = true;
            const minutesString = minutesBeforeMaintenance == 1 ? ' minute' : ' minutes';
            this.uiManager.displayMessage('In ~' + Math.round(minutesBeforeMaintenance).toString() + 
                minutesString + ', app will close for database maintenance for 5 minutes.');
        }
        
        // Check if we're already in maintenance
        const minutesInMaintenance = isInMaintenanceWindow();
        if (0 <= minutesInMaintenance && minutesInMaintenance <= 5) {
            this.uiManager.showMaintenanceOverlay();
        } else if (minutesInMaintenance < 0) {
            // Schedule maintenance overlay - convert to milliseconds and add small buffer
            setTimeout(() => {
                this.uiManager.showMaintenanceOverlay();
            }, Math.max(Math.abs(minutesInMaintenance) * 60000 + 50, 1000));
        }
    }

    /**
     * Set up maintenance schedule for future notifications
     */
    setupMaintenanceSchedule() {
        const minutesBeforeMaintenance = isApproachingMaintenance();
        
        // If not already in the 5-minute warning period
        if (minutesBeforeMaintenance === 0) {
            // Calculate time until next maintenance warning (19th at 23:55)
            const now = new Date();
            const nextWarning = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() < 19 ? 19 : (now.getUTCMonth() === 11 ? 19 : 49), // Handle December
                23, 55, 0, 0
            ));
            
            // If we're past the 19th for this month, move to next month
            if (now.getUTCDate() > 19 || (now.getUTCDate() === 19 && now.getUTCHours() >= 23 && now.getUTCMinutes() >= 55)) {
                nextWarning.setUTCMonth(nextWarning.getUTCMonth() + 1);
            }
            
            const timeUntilWarning = nextWarning.getTime() - Date.now();
            
            // Schedule a maintenance notification for 5 minutes before maintenance
            setTimeout(() => {
                this.maintenanceTime = true;
                this.uiManager.displayMessage('In ~5 minutes, app will close for maintenance for 5 minutes.');
            }, timeUntilWarning);
        }
    }

    /**
     * Check if we're in maintenance time
     * @returns {boolean} - Whether it's maintenance time
     */
    isMaintenanceTime() {
        return this.maintenanceTime;
    }

    /**
     * Update maintenance message if needed
     */
    updateMaintenanceMessage() {
        if (this.maintenanceTime) {
            const minutesBeforeMaintenance = isApproachingMaintenance();
            if (minutesBeforeMaintenance > 0) {
                const minutesString = Math.round(minutesBeforeMaintenance) == 1 ? ' minute' : ' minutes';
                this.uiManager.displayMessage('In ~' + Math.round(minutesBeforeMaintenance).toString() + 
                    minutesString + ', app will close for maintenance for 5 minutes.');
            }
        }
    }
}