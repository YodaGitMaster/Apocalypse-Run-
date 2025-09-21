import * as THREE from 'three';
import { SFXGenerator } from './SFXGenerator';

export interface AudioConfig {
    volume: number;
    loop: boolean;
    autoplay: boolean;
    fadeInDuration?: number;
    fadeOutDuration?: number;
}

export interface AudioTrack {
    audio: HTMLAudioElement;
    config: AudioConfig;
    isPlaying: boolean;
    isFading: boolean;
}

export class AudioManager {
    private tracks: Map<string, AudioTrack> = new Map();
    private masterVolume: number = 0.7;
    private ambientVolume: number = 0.4;
    private sfxVolume: number = 0.8;
    private currentAmbient: string | null = null;
    private audioContext: AudioContext | null = null;
    private initialized: boolean = false;
    private sfxGenerator: SFXGenerator;

    // Audio file paths
    private readonly audioFiles = {
        // Ambient/Background Music
        'ambient-space': '/audio/ambient-soundscapes-007-space-atmosphere-304974.mp3',
        'horror-background': '/audio/horror-background-atmosphere-156462.mp3',
        'dark-horror': '/audio/dark-horror-soundscape-345814.mp3',
        'mystical-ambient': '/audio/mystical-dark-ambient-soundscape-345817.mp3',
        'thriller-action': '/audio/horror-thriller-action-247745.mp3',
        'thriller-pad': '/audio/over-thriller-pad-391597.mp3'
    };

    constructor() {
        console.log('🔊 AudioManager created');
        this.sfxGenerator = new SFXGenerator();
        this.initializeAudioContext();
    }

    private async initializeAudioContext(): Promise<void> {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            console.log('🎵 Audio context initialized');
        } catch (error) {
            console.warn('⚠️ Failed to initialize audio context:', error);
        }
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Preload key audio files
            await this.loadAudio('horror-background', {
                volume: this.ambientVolume,
                loop: true,
                autoplay: false
            });

            await this.loadAudio('mystical-ambient', {
                volume: this.ambientVolume,
                loop: true,
                autoplay: false
            });

            await this.loadAudio('thriller-pad', {
                volume: this.ambientVolume * 0.6,
                loop: true,
                autoplay: false
            });

            this.initialized = true;
            console.log('🎵 AudioManager initialized successfully');
        } catch (error) {
            console.warn('⚠️ Failed to initialize AudioManager:', error);
        }
    }

    private async loadAudio(trackId: string, config: AudioConfig): Promise<void> {
        const filePath = this.audioFiles[trackId as keyof typeof this.audioFiles];
        if (!filePath) {
            console.warn(`⚠️ Audio file not found for track: ${trackId}`);
            return;
        }

        return new Promise((resolve, reject) => {
            const audio = new Audio(filePath);
            audio.volume = config.volume * this.masterVolume;
            audio.loop = config.loop;
            audio.preload = 'auto';

            const track: AudioTrack = {
                audio,
                config,
                isPlaying: false,
                isFading: false
            };

            audio.addEventListener('loadeddata', () => {
                this.tracks.set(trackId, track);
                console.log(`🎵 Loaded audio track: ${trackId}`);
                resolve();
            });

            audio.addEventListener('error', (e) => {
                console.warn(`⚠️ Failed to load audio track ${trackId}:`, e);
                reject(e);
            });

            // Handle audio context resume (required by some browsers)
            audio.addEventListener('canplaythrough', () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume().catch(console.warn);
                }
            });
        });
    }

    public async playAmbient(trackId: string, fadeInDuration: number = 2000): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Stop current ambient if playing
        if (this.currentAmbient && this.currentAmbient !== trackId) {
            await this.stopAmbient(1000);
        }

        const track = this.tracks.get(trackId);
        if (!track) {
            console.warn(`⚠️ Audio track not found: ${trackId}`);
            return;
        }

        try {
            // Reset audio to beginning
            track.audio.currentTime = 0;
            track.audio.volume = 0;

            await track.audio.play();
            track.isPlaying = true;
            this.currentAmbient = trackId;

            // Fade in
            if (fadeInDuration > 0) {
                this.fadeIn(trackId, fadeInDuration);
            } else {
                track.audio.volume = track.config.volume * this.masterVolume * this.ambientVolume;
            }

            console.log(`🎵 Playing ambient track: ${trackId}`);
        } catch (error) {
            console.warn(`⚠️ Failed to play ambient track ${trackId}:`, error);
        }
    }

    public async stopAmbient(fadeOutDuration: number = 1000): Promise<void> {
        if (!this.currentAmbient) return;

        const track = this.tracks.get(this.currentAmbient);
        if (!track || !track.isPlaying) return;

        if (fadeOutDuration > 0) {
            await this.fadeOut(this.currentAmbient, fadeOutDuration);
        }

        track.audio.pause();
        track.isPlaying = false;
        this.currentAmbient = null;

        console.log('🔇 Stopped ambient audio');
    }

    private fadeIn(trackId: string, duration: number): void {
        const track = this.tracks.get(trackId);
        if (!track) return;

        track.isFading = true;
        const targetVolume = track.config.volume * this.masterVolume * this.ambientVolume;
        const steps = 60; // 60 FPS
        const stepDuration = duration / steps;
        const volumeStep = targetVolume / steps;

        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            track.audio.volume = Math.min(volumeStep * currentStep, targetVolume);

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                track.isFading = false;
            }
        }, stepDuration);
    }

    private fadeOut(trackId: string, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const track = this.tracks.get(trackId);
            if (!track) {
                resolve();
                return;
            }

            track.isFading = true;
            const initialVolume = track.audio.volume;
            const steps = 60; // 60 FPS
            const stepDuration = duration / steps;
            const volumeStep = initialVolume / steps;

            let currentStep = 0;
            const fadeInterval = setInterval(() => {
                currentStep++;
                track.audio.volume = Math.max(initialVolume - (volumeStep * currentStep), 0);

                if (currentStep >= steps || track.audio.volume <= 0) {
                    clearInterval(fadeInterval);
                    track.audio.volume = 0;
                    track.isFading = false;
                    resolve();
                }
            }, stepDuration);
        });
    }

    public playSFX(trackId: string, volume: number = 1.0): void {
        // For SFX, we'll create temporary audio elements
        const filePath = this.audioFiles[trackId as keyof typeof this.audioFiles];
        if (!filePath) {
            console.warn(`⚠️ SFX audio file not found: ${trackId}`);
            return;
        }

        const audio = new Audio(filePath);
        audio.volume = volume * this.masterVolume * this.sfxVolume;
        audio.play().catch(error => {
            console.warn(`⚠️ Failed to play SFX ${trackId}:`, error);
        });

        // Clean up after playing
        audio.addEventListener('ended', () => {
            audio.remove();
        });
    }

    public setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        console.log(`🔊 Master volume set to ${this.masterVolume}`);
    }

    public setAmbientVolume(volume: number): void {
        this.ambientVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        console.log(`🎵 Ambient volume set to ${this.ambientVolume}`);
    }

    public setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 SFX volume set to ${this.sfxVolume}`);
    }

    private updateAllVolumes(): void {
        for (const [trackId, track] of this.tracks) {
            if (!track.isFading) {
                track.audio.volume = track.config.volume * this.masterVolume * this.ambientVolume;
            }
        }
    }

    public pauseAll(): void {
        for (const track of this.tracks.values()) {
            if (track.isPlaying) {
                track.audio.pause();
            }
        }
        console.log('⏸️ All audio paused');
    }

    public resumeAll(): void {
        for (const track of this.tracks.values()) {
            if (track.isPlaying && track.audio.paused) {
                track.audio.play().catch(console.warn);
            }
        }
        console.log('▶️ All audio resumed');
    }

    public getCurrentAmbient(): string | null {
        return this.currentAmbient;
    }

    public isPlaying(trackId: string): boolean {
        const track = this.tracks.get(trackId);
        return track ? track.isPlaying : false;
    }

    // Game-specific audio methods
    public playGameStartAmbient(): void {
        this.playAmbient('horror-background', 3000);
    }

    public playLowPowerAmbient(): void {
        if (this.currentAmbient !== 'thriller-pad') {
            this.playAmbient('thriller-pad', 2000);
        }
    }

    public playNormalAmbient(): void {
        if (this.currentAmbient !== 'horror-background') {
            this.playAmbient('horror-background', 2000);
        }
    }

    public playGameOverAmbient(): void {
        this.playAmbient('mystical-ambient', 1000);
    }

    public createPositionalAudio(trackId: string, position: THREE.Vector3, maxDistance: number = 50): void {
        // Future enhancement: 3D positional audio
        // For now, just play as regular SFX
        this.playSFX(trackId, 0.5);
    }

    // Procedural SFX methods
    public playLootboxCollectSFX(rarity: 'common' | 'rare' | 'epic' | 'legendary'): void {
        this.sfxGenerator.playLootboxCollect(rarity);
    }

    public playPowerGainSFX(): void {
        this.sfxGenerator.playPowerGain();
    }

    public playFlashlightToggleSFX(isOn: boolean): void {
        this.sfxGenerator.playFlashlightToggle(isOn);
    }

    public playLowPowerWarningSFX(): void {
        this.sfxGenerator.playLowPowerWarning();
    }

    public playFootstepSFX(): void {
        this.sfxGenerator.playFootstep();
    }

    public dispose(): void {
        this.stopAmbient(0);

        for (const track of this.tracks.values()) {
            track.audio.pause();
            track.audio.remove();
        }

        this.tracks.clear();
        this.initialized = false;

        if (this.audioContext) {
            this.audioContext.close().catch(console.warn);
            this.audioContext = null;
        }

        this.sfxGenerator.dispose();

        console.log('🔇 AudioManager disposed');
    }
}
