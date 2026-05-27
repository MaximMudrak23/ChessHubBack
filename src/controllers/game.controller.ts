import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { gameService } from '../services/game.service';

export async function findGame(req: AuthRequest, res: Response) {
    try {
        const userID = req.userId;
        if (!userID) return res.status(401).json({ message: 'Unauthorized' });

        const result = await gameService.findGame(userID);

        return res.status(200).json(result);
    } catch (error: any) {
        console.log('FIND GAME ERROR:', error);
        if (error.message === 'USER NOT FOUND') return res.status(404).json({ message: 'User not found' });
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function cancelSearch(req: AuthRequest, res: Response) {
    try {
        const userID = req.userId;
        if (!userID) return res.status(401).json({ message: 'Unauthorized' });

        await gameService.cancelSearch(userID);

        return res.status(200).json({ message: 'Search cancelled' });
    } catch (error) {
        console.log('CANCEL SEARCH ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function finishGame(req: AuthRequest, res: Response) {
    try {
        const userID = req.userId;
        if (!userID) return res.status(401).json({ message: 'Unauthorized' });

        const { gameId, winner, finishedReason, moves } = req.body;

        if (!gameId) return res.status(400).json({ message: 'Game ID is required' });

        const result = await gameService.finishGame(userID, gameId, winner, finishedReason, moves);

        return res.status(200).json({
            message: 'Game finished',
            game: result.game,
            user: result.user,
        });
    } catch (error: any) {
        console.log('FINISH GAME ERROR:', error);
        
        if (error.message === 'GAME NOT FOUND') {
            return res.status(404).json({ message: 'Game not found' });
        }
        if (error.message === 'INVALID WINNER TYPE') {
            return res.status(400).json({ message: 'Invalid winner type' });
        }
        
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function getGameById(req: Request, res: Response) {
    try {
        const id = String(req.params.id);

        const existingGame = await gameService.getGameById(id);

        return res.status(200).json({ game: existingGame });
    } catch (error: any) {
        console.log('GET GAME BY ID ERROR:', error);
        if (error.message === 'GAME NOT FOUND') return res.status(404).json({ message: 'Game not found' });
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function getActiveGame(req: AuthRequest, res: Response) {
    try {
        const userID = req.userId;
        if (!userID) return res.status(401).json({ message: 'Unauthorized' });

        const activeGame = await gameService.getActiveGame(userID);

        return res.status(200).json({ game: activeGame ?? null });
    } catch (error) {
        console.log('GET ACTIVE GAME ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function makeMove(req: AuthRequest, res: Response) {
    try {
        const { gameId, pieceID, targetSquare } = req.body;

        if (!gameId || !pieceID || !targetSquare) {
            return res.status(400).json({ message: 'Move data is missing' });
        }

        const result = await gameService.makeMove(gameId, pieceID, targetSquare);

        return res.status(200).json(result);
    } catch (error: any) {
        console.log('MAKE MOVE ERROR:', error);

        if (error.message === 'GAME NOT FOUND') {
            return res.status(404).json({ message: 'Game not found' });
        }
        if (error.message === 'GAME NOT ACTIVE') {
            return res.status(400).json({ message: 'Game is not active' });
        }
        if (error.message === 'ILLEGAL MOVE') {
            return res.status(400).json({ message: 'Illegal move' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}