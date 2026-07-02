import path from 'path';
import { UciEngineBase } from './UciEngineBase';

export class KomodoEngine extends UciEngineBase {
    protected binaryPath = process.env.KOMODO_PATH
        || path.resolve(process.cwd(), 'src/engines/bin/komodo-14.1');

    protected skillOptionName = 'Skill';
    protected minSkillLevel = 1;
    protected maxSkillLevel = 25;
}