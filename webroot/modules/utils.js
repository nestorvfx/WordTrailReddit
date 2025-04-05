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
 * Checks if current time is within 5 minutes of 20th of the month (UTC)
 * @returns {number} - Minutes until the maintenance time
 */
export function isWithin5MinutesOf20thUTC() {
    const now = new Date();
    return (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20) - Date.now()) / 60000;
}

/**
 * Checks if current time is within 5 minutes after 20th of the month (UTC)
 * @returns {number} - Minutes since the maintenance start time
 */
export function isWithin5MinutesIn20thUTC() {
    const now = new Date();
    return (Date.now() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20)) / 60000;
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