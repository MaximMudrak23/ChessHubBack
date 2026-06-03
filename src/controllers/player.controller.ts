import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { playerService } from "../services/player.service";

export async function searchPlayers(req: AuthRequest, res: Response) {
    try {
        const q = String(req.query.q || '').trim();
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        const result = await playerService.searchPlayers(q, page, limit);

        return res.status(200).json(result);
    } catch (error) {
        console.log('SEARCH PLAYERS ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function getPlayerById(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        const existingPlayer = await playerService.getPlayerById(id);

        return res.status(200).json({ user: existingPlayer });
    } catch (error: any) {
        console.log('GET PLAYER BY ID ERROR:', error);

        if (error.message === 'PLAYER NOT FOUND') {
            return res.status(404).json({ message: 'Player not found' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function getPlayerActiveGame(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        const activeGame = await playerService.getActiveGameByPlayerId(id);

        return res.status(200).json({
            game: activeGame ?? null,
        });
    } catch (error) {
        console.log('GET PLAYER ACTIVE GAME ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}