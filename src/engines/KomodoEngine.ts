import path from 'path';
import { UciEngineBase } from './UciEngineBase';
import { ENGINE_CONFIG } from './engineConfig';

export class KomodoEngine extends UciEngineBase {
    protected binaryPath = process.env.KOMODO_PATH
        || path.resolve(__dirname, 'bin/komodo-14.1');

    protected skillOptionName = ENGINE_CONFIG.komodo.skillOptionName;
    protected minSkillLevel = ENGINE_CONFIG.komodo.minSkillLevel;
    protected maxSkillLevel = ENGINE_CONFIG.komodo.maxSkillLevel;
}