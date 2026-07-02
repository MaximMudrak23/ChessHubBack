import { ChessEngine } from './ChessEngine.interface';
import { StockfishEngine } from './StockfishEngine';
import { KomodoEngine } from './KomodoEngine';
import { DragonEngine } from './DragonEngine';

export type EngineType = 'stockfish' | 'komodo' | 'dragon';

const engines: Record<EngineType, new () => ChessEngine> = {
    stockfish: StockfishEngine,
    komodo: KomodoEngine,
    dragon: DragonEngine,
};

export function createEngine(type: EngineType): ChessEngine {
    const Engine = engines[type];

    if (!Engine) {
        throw new Error(`Unknown engine type: ${type}`);
    }

    return new Engine();
}