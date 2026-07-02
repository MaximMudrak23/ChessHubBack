export interface EngineOptions {
    skillLevel?: number;
    movetime?: number;
}

export interface ChessEngine {
    getBestMove(fen: string, options?: EngineOptions): Promise<string>;
}