import path from 'path';
import { UciEngineBase } from './UciEngineBase';
import { ENGINE_CONFIG } from './engineConfig';

export class RecklessEngine extends UciEngineBase {
    protected binaryPath = process.env.RECKLESS_PATH
        || path.resolve(__dirname, 'bin/reckless-linux-generic');

    protected skillOptionName = ENGINE_CONFIG.reckless.skillOptionName;
    protected minSkillLevel = ENGINE_CONFIG.reckless.minSkillLevel;
    protected maxSkillLevel = ENGINE_CONFIG.reckless.maxSkillLevel;
}
