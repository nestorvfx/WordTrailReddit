import { isWithin5MinutesOf20thUTC, isWithin5MinutesIn20thUTC } from './utils.js';

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
        const minutesOffset = isWithin5MinutesOf20thUTC();
        
        if (0 < minutesOffset && minutesOffset <= 5) {
            this.maintenanceTime = true;
            const minutesString = Math.round(minutesOffset) == 1 ? ' minute' : ' minutes';
            this.uiManager.displayMessage('In ~' + Math.round(minutesOffset).toString() + 
                minutesString + ', app will close for database maintenance for 5 minutes.');
        }
        
        // Check if we're already in maintenance
        const diffInMinutes = isWithin5MinutesIn20thUTC();
        if (-0.1 < diffInMinutes && diffInMinutes <= 5) {
            this.uiManager.showMaintenanceOverlay();
        } else if (diffInMinutes < 0) {
            // Schedule maintenance overlay
            setTimeout(() => {
                this.uiManager.showMaintenanceOverlay();
            }, Math.max(-diffInMinutes * 60000 - 0.05, 1000));
        }
    }

    /**
     * Set up maintenance schedule for future notifications
     */
    setupMaintenanceSchedule() {
        const minutesOffset = isWithin5MinutesOf20thUTC();
        
        if (!(0 < minutesOffset && minutesOffset <= 5)) {
            // Schedule a maintenance notification for 5 minutes before maintenance
            setTimeout(() => {
                this.uiManager.displayMessage('In ~5 minutes, app will close for maintenance for 5 minutes.');
            }, Math.max(Math.abs((minutesOffset - 5) * 60000) - 0.05, 1000));
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
            const minutesOffset = isWithin5MinutesOf20thUTC();
            const minutesString = Math.round(minutesOffset) == 1 ? ' minute' : ' minutes';
            this.uiManager.displayMessage('In ~' + Math.round(minutesOffset).toString() + 
                minutesString + ', app will close for maintenance for 5 minutes.');
        }
    }
} 