import path from 'path';
import { UciEngineBase } from './UciEngineBase';

export class DragonEngine extends UciEngineBase {
    protected binaryPath = process.env.DRAGON_PATH
        || path.resolve(process.cwd(), 'src/engines/bin/dragon-1');

    protected skillOptionName = 'Skill';
    protected minSkillLevel = 1;
    protected maxSkillLevel = 25;
}