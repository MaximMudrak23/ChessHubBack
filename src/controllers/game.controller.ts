import { Request, Response } from 'express';
import { getStockfishMove } from '../stockfish-engine/stockfish';

export async function getBotMove(req: Request, res: Response) {
    try {
        const { fen, skillLevel } = req.body;

        const move = await getStockfishMove(
            fen,
            skillLevel ?? 5,
        );

        return res.json({ move });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}