export class SFXGenerator {
    private audioContext: AudioContext | null = null;

    constructor() {
        this.initializeAudioContext();
    }

    private initializeAudioContext(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
            console.warn('⚠️ Failed to initialize SFX audio context:', error);
        }
    }

    private async ensureAudioContext(): Promise<AudioContext> {
        if (!this.audioContext) {
            this.initializeAudioContext();
        }

        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        return this.audioContext!;
    }

    public async playLootboxCollect(rarity: 'common' | 'rare' | 'epic' | 'legendary'): Promise<void> {
        try {
            const audioContext = await this.ensureAudioContext();
            if (!audioContext) return;

            // Different frequencies and patterns based on rarity
            const rarityConfig = {
                common: { freq: 440, duration: 0.2, volume: 0.3 },
                rare: { freq: 554, duration: 0.3, volume: 0.4 },
                epic: { freq: 659, duration: 0.4, volume: 0.5 },
                legendary: { freq: 880, duration: 0.6, volume: 0.6 }
            };

            const config = rarityConfig[rarity];
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Create a pleasant chime sound
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(config.freq, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(config.freq * 1.5, audioContext.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(config.freq, audioContext.currentTime + config.duration);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(config.volume, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + config.duration);

        } catch (error) {
            console.warn('⚠️ Failed to play lootbox collect SFX:', error);
        }
    }

    public async playPowerGain(): Promise<void> {
        try {
            const audioContext = await this.ensureAudioContext();
            if (!audioContext) return;

            // Upward sweep for power gain
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);

        } catch (error) {
            console.warn('⚠️ Failed to play power gain SFX:', error);
        }
    }

    public async playFlashlightToggle(isOn: boolean): Promise<void> {
        try {
            const audioContext = await this.ensureAudioContext();
            if (!audioContext) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different sound for on/off
            if (isOn) {
                // Click on - quick high beep
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            } else {
                // Click off - quick low beep
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            }

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);

        } catch (error) {
            console.warn('⚠️ Failed to play flashlight toggle SFX:', error);
        }
    }

    public async playLowPowerWarning(): Promise<void> {
        try {
            const audioContext = await this.ensureAudioContext();
            if (!audioContext) return;

            // Pulsing low frequency warning
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);

            // Pulsing effect
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);

        } catch (error) {
            console.warn('⚠️ Failed to play low power warning SFX:', error);
        }
    }

    public async playFootstep(): Promise<void> {
        try {
            const audioContext = await this.ensureAudioContext();
            if (!audioContext) return;

            // Simple noise-based footstep
            const bufferSize = audioContext.sampleRate * 0.1; // 0.1 seconds
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = buffer.getChannelData(0);

            // Generate noise
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.1;
            }

            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();

            source.buffer = buffer;
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, audioContext.currentTime);

            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

            source.start(audioContext.currentTime);

        } catch (error) {
            console.warn('⚠️ Failed to play footstep SFX:', error);
        }
    }

    public dispose(): void {
        if (this.audioContext) {
            this.audioContext.close().catch(console.warn);
            this.audioContext = null;
        }
    }
}
