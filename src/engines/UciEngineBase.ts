import { spawn } from 'child_process';
import { ChessEngine, EngineOptions } from './ChessEngine.interface';

export abstract class UciEngineBase implements ChessEngine {
    protected abstract binaryPath: string;

    protected skillOptionName = 'Skill Level';
    protected minSkillLevel = 0;
    protected maxSkillLevel = 20;

    protected normalizeSkillLevel(skillLevel: number) {
        return Math.max(
            this.minSkillLevel,
            Math.min(this.maxSkillLevel, Math.round(skillLevel))
        );
    }

    getBestMove(fen: string, options: EngineOptions = {}): Promise<string> {
        const { skillLevel = 5, movetime = 500 } = options;
        const safeSkillLevel = this.normalizeSkillLevel(skillLevel);

        return new Promise((resolve, reject) => {
            const engine = spawn(this.binaryPath);

            let output = '';
            let isReadySent = false;
            let goSent = false;
            let resolved = false;

            const fail = (error: unknown) => {
                if (resolved) return;
                resolved = true;
                engine.kill();
                reject(error);
            };

            engine.on('error', (err) => {
                fail(`Failed to start engine: ${err.message}`);
            });

            engine.stderr.on('data', (data) => {
                fail(data.toString());
            });

            engine.stdout.on('data', (data) => {
                output += data.toString();

                if (!isReadySent && output.includes('uciok')) {
                    isReadySent = true;
                    engine.stdin.write(`setoption name ${this.skillOptionName} value ${safeSkillLevel}\n`);
                    engine.stdin.write('isready\n');
                    return;
                }

                if (!goSent && output.includes('readyok')) {
                    goSent = true;
                    engine.stdin.write(`position fen ${fen}\n`);
                    engine.stdin.write(`go movetime ${movetime}\n`);
                    return;
                }

                const bestMoveLine = output
                    .split('\n')
                    .find(line => line.startsWith('bestmove'));

                if (bestMoveLine && !resolved) {
                    resolved = true;
                    engine.kill();
                    resolve(bestMoveLine.split(' ')[1]);
                }
            });

            engine.stdin.write('uci\n');
        });
    }
}