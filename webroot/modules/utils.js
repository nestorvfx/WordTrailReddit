import * as THREE from '../three.js/three.module.min.js';

// Utility functions for the Word Trail game

/**
 * Clamps a value between min and max
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} - The clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Remaps a value from one range to another
 * @param {number} value - The value to remap
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} - The remapped value
 */
export function remap(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Generates a random point within a circle
 * @param {THREE.Vector3} center - Center point of the circle
 * @param {number} r - Radius of the circle
 * @returns {THREE.Vector3} - Random point inside the circle
 */
export function randomPointInCircle(center, r) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * r;
    const x = center.x + distance * Math.cos(angle);
    const y = center.y + distance * Math.sin(angle);
    return new THREE.Vector3(x, y, center.z);
}

/**
 * Checks if we're within 5 minutes before the 20th day of the month (23:55-23:59 on 19th)
 * @returns {number} Minutes until midnight of the 20th if in the window (1-5), or 0 if outside window
 */
export function isApproachingMaintenance() {
    const now = new Date();
    const day = now.getUTCDate();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    // Check if it's the 19th day of the month between 23:55 and 23:59
    if (day === 19 && hour === 23 && minute >= 55 && minute < 60) {
        // Return minutes until midnight (1-5)
        return 60 - minute;
    }
    return 0;  // Not in the pre-maintenance window
}

/**
 * Checks if we're within the first 5 minutes of the 20th day of the month (00:00-00:05)
 * @returns {number} Minutes since midnight of the 20th if in the window (0-5), or -1 if before, or 6+ if after
 */
export function isInMaintenanceWindow() {
    const now = new Date();
    const day = now.getUTCDate();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    // If it's the 19th day, return negative value (minutes until maintenance)
    if (day === 19 && hour === 23) {
        return -((60 - minute) + 0.1); // Adding 0.1 ensures we don't hit exactly 0
    }
    
    // If it's the 20th day at midnight hour (00:xx)
    if (day === 20 && hour === 0) {
        // If within first 5 minutes, return minutes since midnight
        if (minute < 5) {
            return minute;
        }
        // After first 5 minutes but still in the hour
        return 6; // Past the maintenance window
    }
    
    // If it's the 20th but past 00:05, or any other day
    return day < 20 ? -1000 : 1000; // Far outside the maintenance window
}

/**
 * Displays a message in the message bar
 * @param {string} message - The message to display
 * @param {HTMLElement} formMessage - The element to show the message in
 * @returns {boolean} - Whether the message is about maintenance
 */
export function displayBarMessage(message, formMessage) {
    formMessage.textContent = message;
    formMessage.style.display = 'block';
    formMessage.style.opacity = 0.8;
    return message.endsWith('5 minutes.');
}