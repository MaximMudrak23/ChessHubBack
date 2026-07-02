import path from 'path';
import { UciEngineBase } from './UciEngineBase';

export class StockfishEngine extends UciEngineBase {
    protected binaryPath = process.env.STOCKFISH_PATH
        || path.resolve(process.cwd(), 'src/engines/bin/stockfish-18');

    protected skillOptionName = 'Skill Level';
    protected minSkillLevel = 0;
    protected maxSkillLevel = 20;
}