import { ChessEngine } from './ChessEngine.interface';
import { StockfishEngine } from './StockfishEngine';
import { KomodoEngine } from './KomodoEngine';
import { DragonEngine } from './DragonEngine';
import { RecklessEngine } from './RecklessEngine';

export type EngineType = 'stockfish' | 'komodo' | 'dragon' | 'reckless';

const engines: Record<EngineType, new () => ChessEngine> = {
    stockfish: StockfishEngine,
    komodo: KomodoEngine,
    dragon: DragonEngine,
    reckless: RecklessEngine,
};

export function createEngine(type: EngineType): ChessEngine {
    const Engine = engines[type];

    if (!Engine) {
        throw new Error(`Unknown engine type: ${type}`);
    }

    return new Engine();
}