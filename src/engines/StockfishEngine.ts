import path from 'path';
import { UciEngineBase } from './UciEngineBase';
import { ENGINE_CONFIG } from './engineConfig';

export class StockfishEngine extends UciEngineBase {
    protected binaryPath = process.env.STOCKFISH_PATH
        || path.resolve(__dirname, 'bin/stockfish-18');

    protected skillOptionName = ENGINE_CONFIG.stockfish.skillOptionName;
    protected minSkillLevel = ENGINE_CONFIG.stockfish.minSkillLevel;
    protected maxSkillLevel = ENGINE_CONFIG.stockfish.maxSkillLevel;
}