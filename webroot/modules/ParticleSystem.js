import * as THREE from '../three.js/three.module.min.js';
import { Line2 } from '../three.js/lines/Line2.js';
import { LineMaterial } from '../three.js/lines/LineMaterial.js';
import { LineGeometry } from '../three.js/lines/LineGeometry.js';
import { clamp, remap, randomPointInCircle } from './utils.js';
import { MAX_WORD_COUNT } from './constants.js';

/**
 * Class that manages the particle system for word visualization
 */
export class ParticleSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.particles = [];
        this.trails = [];
        this.particleCount = 0;
        this.currentWord = '';
        this.numberArray = [];
        this.lettersPositions = null;
        this.lettersIndices = null;
        this.xRemapRange = 2;
        this.yOffset = 1 * clamp(camera.aspect, 0.9, 1.8);
        this.letterScaling = 1.8;
        this.radiusScaling = 0;
        this.totalDeltaTime = 0;
        this.currentWordIndex = 0;
        
        // Pre-allocate reusable vectors to avoid creating new ones during updates
        this._tempVector1 = new THREE.Vector3();
        this._tempVector2 = new THREE.Vector3();
        this._tempVector3 = new THREE.Vector3();
        
        // Add new properties for trail growth with corrected values
        this.trailGrowthTimer = 0;
        this.maxTrailLength = 120; // Keep the doubled value
        this.initialTrailGrowthSpeed = 0.96; // 0.8 * 1.2 = 0.96
        this.isStartScreen = false; // Flag to track if we're on the start screen
        this.isEndScreen = false;   // Flag to track if we're on the end screen
    }

    /**
     * Initialize the particle system with letter data
     * @param {Array} lettersPositions - Array of Vector3 positions for letter shapes
     * @param {Array} lettersIndices - Array of Vector2 indices for letter shapes
     */
    initialize(lettersPositions, lettersIndices) {
        this.lettersPositions = lettersPositions;
        this.lettersIndices = lettersIndices;
        this.initializeParticles();
    }

    /**
     * Create and initialize all particles
     */
    initializeParticles() {
        // Clear any existing particles
        this.clearParticles();

        // Create a shared sphere geometry for all particles
        const sharedSphereGeometry = new THREE.SphereGeometry(0.06, 8, 8);

        for (let i = 0; i < MAX_WORD_COUNT; i++) {
            const rgb = new THREE.Vector3(Math.random(), Math.random(), Math.random());
            rgb.normalize();
            const color = new THREE.Color(rgb.x, rgb.y, rgb.z).addScalar(0.0);

            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: (i < this.particleCount && this.numberArray[i] != -65),
                depthWrite: false,
                depthTest: false
            });

            // Use the shared geometry for all particles
            const particle = new THREE.Mesh(sharedSphereGeometry, material);
            particle.renderOrder = 2;

            const velocity = new THREE.Vector3(
                Math.random() * 0.01 - 0.01,
                Math.random() * 0.01 + 0.01,
                Math.random() * 0.01 - 0.01
            );

            let targetPosition = new THREE.Vector3(0, 0, 0);
            if (i < this.particleCount && this.currentWord[i] != ' ') {
                targetPosition = this.calculateTargetPosition(i);
                particle.position.copy(targetPosition);
            }

            // Keep using Vector3 objects for trail points
            particle.userData = { 
                targetPosition, 
                velocity, 
                currentIndex: 0,
                trail: [targetPosition.clone(), targetPosition.clone()]
            };

            this.scene.add(particle);
            this.particles.push(particle);

            // Create trail
            const trailMaterial = new LineMaterial({
                color: color.multiplyScalar(0.95),
                linewidth: 4,
                opacity: 1,
                transparent: true,
                depthWrite: false,
                dashed: false,
                depthTest: false,
            });
            
            // Create initial trail geometry
            const trailGeometry = new LineGeometry();
            trailGeometry.setFromPoints(particle.userData.trail);
            
            const trailLine = new Line2(trailGeometry, trailMaterial);
            trailLine.computeLineDistances();
            trailLine.scale.set(1, 1, 1);

            this.scene.add(trailLine);
            this.trails.push(trailLine);
        }
    }

    /**
     * Calculate target position for a particle
     * @param {number} index - Particle index
     * @returns {THREE.Vector3} - Target position
     */
    calculateTargetPosition(index) {
        const xOffset = this.particleCount <= 6
            ? (index - this.particleCount / 2 + 0.5) * 0.7 * this.camera.aspect
            : remap(
                (index - this.particleCount / 2 + 0.5) * 0.7,
                (-this.particleCount / 2 + 0.5) * 0.7,
                (this.particleCount / 2 - 0.5) * 0.7,
                -this.xRemapRange * this.camera.aspect, 
                this.xRemapRange * this.camera.aspect
            );

        const letterScalingRemap = remap(
            this.particleCount,
            1,
            12,
            this.letterScaling * this.camera.aspect, 
            1.4 * this.camera.aspect
        );

        // Use temporary vector to avoid allocations, but still return a new Vector3
        this._tempVector1.copy(this.lettersPositions[this.lettersIndices[this.numberArray[index]].x])
            .multiplyScalar(letterScalingRemap)
            .add(this._tempVector2.set(xOffset, this.yOffset, 0));

        return randomPointInCircle(
            this._tempVector1, 
            clamp(this.currentWordIndex / 50, 0, 0.4) * this.radiusScaling
        );
    }

    /**
     * Update particle system with a new word
     * @param {string} newWord - The new word to visualize
     */
    setNewWord(newWord) {
        this.currentWord = newWord;
        this.particleCount = newWord.length;
        this.numberArray = Array.from(newWord, c => c.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0));
        
        // Reset trail growth timer when setting a new word
        this.trailGrowthTimer = 0;
        
        // Set flags for special screens - reset END screen flag to false when setting any new word
        this.isStartScreen = (newWord === 'Word Trail');
        this.isEndScreen = (newWord === 'SCORE');
        
        // Apply appropriate pre-growth for special screens
        if (this.isStartScreen) {
            this.trailGrowthTimer = 10.0; // Keep the start screen pre-growth
        } else if (this.isEndScreen) {
            this.trailGrowthTimer = 8.0; // Less pre-growth for end screen
        }

        for (let p = 0; p < Math.max(newWord.length, this.particles.length); p++) {
            let opacity = 0;

            if (p < newWord.length && newWord[p] != ' ') {
                opacity = 1;
                if (p < this.particles.length) {
                    this.particles[p].userData.targetPosition = this.calculateTargetPosition(p);
                }
            } else if (p < this.particles.length) {
                this.particles[p].position.set(0, 0, 0);
            }

            if (p < this.particles.length) {
                this.particles[p].material.opacity = opacity;
                
                // Always reset trails to minimal length (just two points at current position)
                const pos = this.particles[p].position.clone();
                this.particles[p].userData.trail = [pos.clone(), pos.clone()];
                
                // Update trail geometry
                const trailGeometry = new LineGeometry();
                trailGeometry.setFromPoints(this.particles[p].userData.trail);
                
                // Dispose old geometry
                if (this.trails[p].geometry) {
                    this.trails[p].geometry.dispose();
                }
                this.trails[p].geometry = trailGeometry;
                this.trails[p].material.opacity = opacity;
            }
        }
    }

    /**
     * Update particle system parameters
     * @param {Object} params - Parameters to update
     */
    updateParams(params) {
        const { xRemapRange, yOffset, letterScaling, radiusScaling, currentWordIndex, isEndScreen } = params;
        
        if (xRemapRange !== undefined) this.xRemapRange = xRemapRange;
        if (yOffset !== undefined) this.yOffset = yOffset;
        if (letterScaling !== undefined) this.letterScaling = letterScaling;
        if (radiusScaling !== undefined) this.radiusScaling = radiusScaling;
        if (currentWordIndex !== undefined) this.currentWordIndex = currentWordIndex;
        
        // Only set isEndScreen if explicitly provided (don't reset it otherwise)
        if (isEndScreen !== undefined) {
            this.isEndScreen = isEndScreen;
            
            // Reset growth timers if we're switching to end screen
            if (isEndScreen) {
                this.trailGrowthTimer = 8.0;
            }
        }
    }

    /**
     * Update particles for animation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (this.particles.length === 0) return;
        
        // Increase the growth timer at appropriate speeds for different screens
        if (this.isStartScreen) {
            this.trailGrowthTimer += deltaTime * 0.96; // 0.8 * 1.2
        } else if (this.isEndScreen) {
            this.trailGrowthTimer += deltaTime * 1.44; // 1.2 * 1.2
        } else {
            this.trailGrowthTimer += deltaTime * 1.08; // 0.9 * 1.2
        }
        
        // Calculate particle movement speed and trail growth speed
        let particleSpeedMultiplier, trailGrowthMultiplier;
        
        if (this.isStartScreen) {
            // Start screen - 1.2x faster particles, 1.5x longer trails
            particleSpeedMultiplier = 0.84;
            trailGrowthMultiplier = 14.4; // 12.0 * 1.2
        } else if (this.isEndScreen) {
            // End screen - Slower particles with longer trails
            particleSpeedMultiplier = 0.7;
            trailGrowthMultiplier = 21.6; // 18.0 * 1.2
        } else {
            // Regular gameplay - more balanced progression
            particleSpeedMultiplier = 1.0 + Math.min(this.currentWordIndex * 0.12, 1.2); // Reduced multiplier
            
            // Slower trail growth for regular words
            trailGrowthMultiplier = 0.96 + Math.min(this.currentWordIndex * 0.24, 1.92); // 0.8 * 1.2, 0.2 * 1.2, 1.6 * 1.2
            
            // Apply diminishing returns after word 7
            if (this.currentWordIndex > 7) {
                particleSpeedMultiplier = 2.2 + Math.log10(1 + (this.currentWordIndex - 7) * 0.05); // Reduced acceleration
                trailGrowthMultiplier = 2.88 + Math.log10(1 + (this.currentWordIndex - 7) * 0.084); // 2.4 * 1.2, 0.07 * 1.2
            }
        }
        
        // Apply multipliers to total delta time for animation
        this.totalDeltaTime += deltaTime * particleSpeedMultiplier;

        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.particles[i];
            const trailLine = this.trails[i];

            if (this.numberArray[i] != -65) {
                const indices = this.lettersIndices[this.numberArray[i]];
                let currentIndex = particle.userData.currentIndex;
                let trail = particle.userData.trail;

                let targetPosition = particle.userData.targetPosition;
                let velocity = particle.userData.velocity;

                // Use temporary vectors for calculations to avoid allocations
                this._tempVector1.copy(targetPosition).sub(particle.position);

                let distance = this._tempVector1.length();
                if (distance > 0) {
                    if (distance < 0.1) {
                        if ((this.currentWordIndex > 3 && ((this.numberArray[i] + i) % 3 == 0) && this.radiusScaling == 1) 
                            || (this.numberArray[i] == 3 || this.numberArray[i] == 14)) {
                            // Go from last point to first approach
                            particle.userData.currentIndex = (currentIndex + 1) % indices.y;
                        }
                        else {
                            // Go back around letter the same way
                            if (currentIndex >= indices.y - 1) {
                                particle.userData.currentIndex = -indices.y + 1;
                            } else {
                                particle.userData.currentIndex = currentIndex + 1;
                            }
                        }

                        // Calculate new target position
                        const xOffset = this.particleCount <= 6
                            ? (i - this.particleCount / 2 + 0.5) * 0.7 * this.camera.aspect
                            : remap(
                                (i - this.particleCount / 2 + 0.5) * 0.7,
                                (-this.particleCount / 2 + 0.5) * 0.7,
                                (this.particleCount / 2 - 0.5) * 0.7,
                                -this.xRemapRange * this.camera.aspect, 
                                this.xRemapRange * this.camera.aspect
                            );

                        const letterScalingRemap = remap(
                            this.particleCount,
                            1,
                            12,
                            this.letterScaling * this.camera.aspect, 
                            1.4 * this.camera.aspect
                        );

                        // Use the modified calculation but still create a new Vector3
                        this._tempVector3.copy(this.lettersPositions[indices.x + Math.abs(particle.userData.currentIndex)])
                            .multiplyScalar(letterScalingRemap)
                            .add(this._tempVector2.set(xOffset, this.yOffset, 0));
                            
                        particle.userData.targetPosition = randomPointInCircle(
                            this._tempVector3,
                            clamp(this.currentWordIndex / 50, 0, 0.4) * this.radiusScaling
                        );
                    }
                    
                    // Adjust movement speed more moderately
                    this._tempVector1.normalize().multiplyScalar(
                        (1 + this.currentWordIndex / 30) * // More gradual increase with word count 
                        (1.8 - (1 - this.radiusScaling) * 0.7) * 
                        deltaTime * this.camera.aspect
                    );
                }

                // Use temporary vector for velocity calculation
                // Make particle movement smoother by adjusting the lerp factor
                const lerpFactor = this.isStartScreen 
                    ? 0.12 // Smoother movement for start screen
                    : clamp(0.14 + this.currentWordIndex / 120, 0.14, 0.25); // More gradual increase
                
                this._tempVector2.set(0, 0, 0).lerpVectors(
                    velocity, 
                    this._tempVector1, 
                    lerpFactor
                );

                // Create a new velocity vector (to match original behavior)
                particle.userData.velocity = this._tempVector2.clone();
                
                // Update position
                particle.position.add(this._tempVector2);

                // Add current position to trail (as Vector3 object)
                trail.push(particle.position.clone());

                // Calculate max trail points based on different factors for each screen type
                let maxTrailPoints;
                
                if (this.isStartScreen) {
                    // Start screen trails
                    maxTrailPoints = Math.floor(52.5 * this.camera.aspect);
                } else if (this.isEndScreen) {
                    // End screen trails
                    maxTrailPoints = Math.floor(70.0 * this.camera.aspect); // Reduced from 94.5
                } else {
                    // Calculate current growth speed based on word count - reduced for gameplay
                    const currentGrowthSpeed = this.initialTrailGrowthSpeed * trailGrowthMultiplier;
                    
                    // Dynamic growth based on time passed
                    maxTrailPoints = Math.floor(Math.min(
                        4 + currentGrowthSpeed * this.trailGrowthTimer, // Start with 4 points
                        this.maxTrailLength * this.camera.aspect
                    ));
                }
                
                // Remove oldest points if trail is too long
                while (trail.length > maxTrailPoints) {
                    trail.shift();
                }
                
                // Create new geometry each time as in original code
                if (trailLine.geometry) {
                    trailLine.geometry.dispose();
                }
                
                const trailGeometry = new LineGeometry();
                trailGeometry.setFromPoints(trail);
                trailLine.geometry = trailGeometry;
            }

            // Check if particles have invalid positions and reset if needed
            if (i === 0 && (
                isNaN(this.particles[0].position.x) || 
                isNaN(this.particles[0].position.y) || 
                isNaN(this.particles[0].position.z)
            )) {
                this.resetParticles();
                break;
            }
        }
    }

    /**
     * Reset particle system
     */
    resetParticles() {
        this.clearParticles();
        this.initializeParticles();
    }

    /**
     * Clear all particles and trails
     */
    clearParticles() {
        // Find and keep the shared sphere geometry
        let sharedGeometry = null;
        if (this.particles.length > 0) {
            sharedGeometry = this.particles[0].geometry;
        }
        
        // Dispose of particle materials only (geometry is shared)
        this.particles.forEach(particle => {
            if (particle.material) particle.material.dispose();
            this.scene.remove(particle);
        });

        this.trails.forEach(trail => {
            if (trail.geometry) trail.geometry.dispose();
            if (trail.material) trail.material.dispose();
            this.scene.remove(trail);
        });

        this.particles = [];
        this.trails = [];

        // Also dispose shared geometry when clearing everything
        if (sharedGeometry) {
            sharedGeometry.dispose();
        }
    }
}