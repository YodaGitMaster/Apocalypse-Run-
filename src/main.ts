import { Game } from './core/Game';
import './style.css';

console.log('🎮 Quake Arena - Starting...');

async function main(): Promise<void> {
    try {
        const game = new Game();
        await game.initialize();
        game.start();
        console.log('🎮 Game started successfully!');
    } catch (error) {
        console.error('❌ Failed to start game:', error);
    }
}

void main();
