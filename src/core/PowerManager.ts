import * as THREE from 'three';

export interface PowerConsumer {
    id: string;
    light: THREE.Light;
    baseIntensity: number;
    consumptionRate: number; // Power units per second
    priority: number; // Higher priority lights stay on longer (1-5)
}

export interface PowerStats {
    currentPower: number;
    maxPower: number;
    consumptionRate: number;
    timeRemaining: number; // Estimated seconds until blackout
}

export class PowerManager {
    private currentPower: number;
    private maxPower: number;
    private consumers: Map<string, PowerConsumer> = new Map();
    private isLowPower: boolean = false;
    private criticalPowerThreshold: number = 20; // 20% of max power
    private lowPowerThreshold: number = 40; // 40% of max power

    // Power consumption rates by light type (reduced by 50% for longer battery life)
    private readonly consumptionRates = {
        ambient: 0.25,     // Very low consumption (was 0.5)
        point: 1.0,        // Medium consumption (was 2.0)  
        spot: 1.5,         // High consumption (was 3.0)
        directional: 0.5,  // Low-medium consumption (was 1.0)
        flashlight: 5.0    // Base flashlight consumption (was 10.0, will be overridden by level)
    };

    // Flashlight consumption rates by level (units per second) - adjusted for requested durations
    private readonly flashlightConsumptionRates = {
        1: 5,     // Level 1: 12 minutes on full battery
        2: 20,    // Level 2: 5 minutes on full battery (adjusted)
        3: 33.33, // Level 3: 3 minutes on full battery (adjusted)
        4: 30,    // Level 4: 2 minutes on full battery
        5: 60     // Level 5: 1 minute on full battery
    };

    // Charge values from lootboxes by rarity (increased for larger battery)
    private readonly chargeValues = {
        common: 180,     // 180 power units (3% of max battery)
        rare: 360,       // 360 power units (6% of max battery)
        epic: 720,       // 720 power units (12% of max battery)
        legendary: 1080  // 1080 power units (18% of max battery)
    };

    constructor(initialPower: number = 6000) {
        this.maxPower = initialPower;
        this.currentPower = initialPower;
        console.log(`⚡ PowerManager initialized with ${initialPower} power units`);
    }

    public registerLight(
        id: string,
        light: THREE.Light,
        lightType: keyof typeof this.consumptionRates = 'point',
        priority: number = 3
    ): void {
        const consumer: PowerConsumer = {
            id,
            light,
            baseIntensity: light.intensity,
            consumptionRate: this.consumptionRates[lightType],
            priority
        };

        this.consumers.set(id, consumer);
        console.log(`💡 Registered ${lightType} light "${id}" with consumption rate ${consumer.consumptionRate}/s`);
    }

    public updateFlashlightConsumption(flashlightId: string, level: number): void {
        const consumer = this.consumers.get(flashlightId);
        if (consumer) {
            if (level === 0) {
                // Level 0 is the signal that the flashlight is off.
                consumer.consumptionRate = 0;
                console.log(`🔦 Updated flashlight consumption to 0/s (OFF)`);
            } else if (this.flashlightConsumptionRates[level]) {
                consumer.consumptionRate = this.flashlightConsumptionRates[level];
                console.log(`🔦 Updated flashlight consumption to ${consumer.consumptionRate}/s for level ${level}`);
            }
        }
    }

    public unregisterLight(id: string): void {
        if (this.consumers.has(id)) {
            this.consumers.delete(id);
            console.log(`💡 Unregistered light "${id}"`);
        }
    }

    public update(deltaTime: number): void {
        if (this.consumers.size === 0) return;

        // Calculate total consumption
        const totalConsumption = this.calculateTotalConsumption();

        // Drain power
        this.currentPower = Math.max(0, this.currentPower - (totalConsumption * deltaTime));

        // Update power state
        this.updatePowerState();

        // Apply power effects to lights
        this.applyPowerEffects();

        // Log power status occasionally
        if (Math.random() < 0.01) { // 1% chance per frame
            const stats = this.getPowerStats();
            console.log(`⚡ Power: ${stats.currentPower.toFixed(1)}/${stats.maxPower} (${stats.timeRemaining.toFixed(0)}s remaining)`);
        }
    }

    private calculateTotalConsumption(): number {
        let total = 0;
        for (const consumer of this.consumers.values()) {
            // For flashlight: only consume power if consumption rate > 0 (respects on/off state)
            // For other lights: only consume power if intensity > 0 (visual state)
            let shouldConsume = false;

            if (consumer.id === 'flashlight') {
                // Flashlight: use consumption rate as the authority (0 when off, >0 when on)
                shouldConsume = consumer.consumptionRate > 0;
            } else {
                // Other lights: use intensity as the authority  
                shouldConsume = consumer.light.intensity > 0.001;
            }

            if (shouldConsume) {
                total += consumer.consumptionRate;
                // Log consumption for debugging (rarely)
                if (Math.random() < 0.01) { // 1% chance per frame for more visibility
                    console.log(`⚡ "${consumer.id}" consuming ${consumer.consumptionRate}/s (rate: ${consumer.consumptionRate}, intensity: ${consumer.light.intensity.toFixed(3)})`);
                }
            }
        }

        // Log total consumption occasionally for debugging
        if (Math.random() < 0.005) { // 0.5% chance per frame
            console.log(`⚡ Total power consumption: ${total}/s`);
        }

        return total;
    }

    private updatePowerState(): void {
        const powerPercentage = (this.currentPower / this.maxPower) * 100;

        const wasLowPower = this.isLowPower;
        this.isLowPower = powerPercentage <= this.lowPowerThreshold;

        // Log power state changes
        if (!wasLowPower && this.isLowPower) {
            console.log('⚠️ Entering low power mode!');
        } else if (wasLowPower && !this.isLowPower) {
            console.log('✅ Exiting low power mode');
        }
    }

    private applyPowerEffects(): void {
        const powerPercentage = (this.currentPower / this.maxPower) * 100;
        const time = Date.now() * 0.001;

        for (const consumer of this.consumers.values()) {
            // Special handling for the flashlight: its state is managed by the Flashlight class itself.
            // The PowerManager should only override for low-power effects.
            if (consumer.id === 'flashlight') {
                if (powerPercentage <= 0) {
                    consumer.light.intensity = 0;
                } else if (powerPercentage <= this.criticalPowerThreshold) {
                    // Critical power: flickering effect, but only if the light is already on
                    if (consumer.light.intensity > 0.001) {
                        const flicker = Math.sin(time * 10 + consumer.priority) * 0.3 + 0.7;
                        consumer.light.intensity = consumer.baseIntensity * flicker * 0.3;
                    }
                } else if (powerPercentage <= this.lowPowerThreshold) {
                    // Low power: dimming effect, but only if the light is already on
                    if (consumer.light.intensity > 0.001) {
                        const dimFactor = powerPercentage / this.lowPowerThreshold;
                        consumer.light.intensity = consumer.baseIntensity * dimFactor;
                    }
                }
                // When power is normal, DO NOTHING. Let the Flashlight class control its intensity.
            } else {
                // Default handling for all other (static) lights
                if (powerPercentage <= 0) {
                    consumer.light.intensity = 0;
                } else if (powerPercentage <= this.criticalPowerThreshold) {
                    const flickerChance = 0.3 + (consumer.priority * 0.1);
                    const flicker = Math.sin(time * 10 + consumer.priority) * 0.3 + 0.7;
                    if (Math.random() < flickerChance) {
                        consumer.light.intensity = consumer.baseIntensity * flicker * 0.3;
                    } else {
                        consumer.light.intensity = 0;
                    }
                } else if (powerPercentage <= this.lowPowerThreshold) {
                    const dimFactor = powerPercentage / this.lowPowerThreshold;
                    const flicker = Math.sin(time * 2 + consumer.priority) * 0.1 + 0.9;
                    consumer.light.intensity = consumer.baseIntensity * dimFactor * flicker;
                } else {
                    // Normal power: restore static lights to full base intensity
                    consumer.light.intensity = consumer.baseIntensity;
                }
            }
        }
    }

    public addCharge(rarity: keyof typeof this.chargeValues): number {
        const chargeAmount = this.chargeValues[rarity];
        const oldPower = this.currentPower;

        this.currentPower = Math.min(this.maxPower, this.currentPower + chargeAmount);
        const actualCharge = this.currentPower - oldPower;

        console.log(`🔋 Added ${actualCharge} power from ${rarity} lootbox (${this.currentPower}/${this.maxPower})`);

        // Create visual effect for power gain
        this.createPowerGainEffect(actualCharge);

        return actualCharge;
    }

    private createPowerGainEffect(chargeAmount: number): void {
        // Create a brief power surge effect on all lights
        for (const consumer of this.consumers.values()) {
            const originalIntensity = consumer.light.intensity;

            // Temporarily boost light intensity
            consumer.light.intensity = Math.min(consumer.baseIntensity * 1.5, originalIntensity * 2);

            // Fade back to normal over 0.5 seconds
            const startTime = Date.now();
            const duration = 500; // milliseconds

            const fadeEffect = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                if (progress >= 1) {
                    return; // Effect complete
                }

                const boostedIntensity = Math.min(consumer.baseIntensity * 1.5, originalIntensity * 2);
                consumer.light.intensity = boostedIntensity + (originalIntensity - boostedIntensity) * progress;

                requestAnimationFrame(fadeEffect);
            };

            requestAnimationFrame(fadeEffect);
        }
    }

    public getPowerStats(): PowerStats {
        const totalConsumption = this.calculateTotalConsumption();
        const timeRemaining = totalConsumption > 0 ? this.currentPower / totalConsumption : Infinity;

        return {
            currentPower: this.currentPower,
            maxPower: this.maxPower,
            consumptionRate: totalConsumption,
            timeRemaining: timeRemaining
        };
    }

    public getPowerPercentage(): number {
        return (this.currentPower / this.maxPower) * 100;
    }

    public isInLowPowerMode(): boolean {
        return this.isLowPower;
    }

    public isInCriticalPowerMode(): boolean {
        return this.getPowerPercentage() <= this.criticalPowerThreshold;
    }

    public isPowerDepleted(): boolean {
        return this.currentPower <= 0;
    }

    public getChargeValue(rarity: keyof typeof this.chargeValues): number {
        return this.chargeValues[rarity];
    }

    public setMaxPower(newMaxPower: number): void {
        const ratio = this.currentPower / this.maxPower;
        this.maxPower = newMaxPower;
        this.currentPower = Math.min(this.currentPower, newMaxPower);
        console.log(`⚡ Max power set to ${newMaxPower}, current power: ${this.currentPower}`);
    }

    public reset(initialPower?: number): void {
        if (initialPower !== undefined) {
            this.maxPower = initialPower;
        }
        this.currentPower = this.maxPower;
        this.isLowPower = false;

        // Reset all lights to full intensity
        for (const consumer of this.consumers.values()) {
            consumer.light.intensity = consumer.baseIntensity;
        }

        console.log(`🔄 Power system reset to ${this.maxPower} units`);
    }

    public clearAllConsumers(): void {
        this.consumers.clear();
        console.log('🔌 All power consumers cleared');
    }
}
