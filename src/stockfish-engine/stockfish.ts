import { spawn } from 'child_process';
import path from 'path';

const enginePath = path.resolve( // not good, what is this? how this thing works and its not dynamic
    'src/stockfish-engine/stockfish/stockfish-macos-m1-apple-silicon'
);

export function getStockfishMove(fen: string, skillLevel: number = 5): Promise<string> {
    return new Promise((resolve, reject) => {
        const engine = spawn(enginePath);

        const safeSkillLevel = Math.max(0, Math.min(20, skillLevel));

        engine.stdin.write('uci\n');
        engine.stdin.write(`setoption name Skill Level value ${safeSkillLevel}\n`);
        engine.stdin.write(`position fen ${fen}\n`);
        engine.stdin.write('go movetime 500\n');

        engine.stdout.on('data', (data) => {
            const text = data.toString();

            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('bestmove')) {
                    const move = line.split(' ')[1];

                    resolve(move);

                    engine.kill();
                    return;
                }
            }
        });

        engine.stderr.on('data', (data) => {
            reject(data.toString());
            engine.kill();
        });
    });
}