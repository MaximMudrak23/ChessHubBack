import path from 'path';
import { UciEngineBase } from './UciEngineBase';
import { ENGINE_CONFIG } from './engineConfig';

export class DragonEngine extends UciEngineBase {
    protected binaryPath = process.env.DRAGON_PATH
        || path.resolve(__dirname, 'bin/dragon-1');

    protected skillOptionName = ENGINE_CONFIG.dragon.skillOptionName;
    protected minSkillLevel = ENGINE_CONFIG.dragon.minSkillLevel;
    protected maxSkillLevel = ENGINE_CONFIG.dragon.maxSkillLevel;
}