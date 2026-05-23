import { Request, Response } from 'express';
import { getStockfishMove } from '../stockfish-engine/stockfish';

import { MatchTicketModel } from '../models/MatchTicket.model';
import { GameModel } from '../models/Game.model';
import { UserModel } from '../models/User.model';
import { BotModel } from '../models/Bot.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { getPublicUser } from '../utils/getPublicUser';
import { scheduleBotSearch } from '../services/botMatchmaking.service';

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

function getEloRange(searchStartedAt: Date) {
    const seconds = (Date.now() - searchStartedAt.getTime()) / 1000;

    if (seconds < 30) return 200;
    if (seconds < 60) return 400;
    if (seconds < 90) return 600;
    if (seconds < 120) return 800;

    return 1000;
}

function getRandomSides() {
    const firstIsWhite = Math.random() < 0.5;

    return {
        firstSide: firstIsWhite ? 'white' : 'black',
        secondSide: firstIsWhite ? 'black' : 'white',
    } as const;
}

function getPlayerIcons(entity: any) {
    return entity.userIcons?.map((icon: any) => ({
        title: icon.title,
        iconURL: icon.iconURL,
    })) ?? [];
}

async function getPlayerFromTicket(ticket: any) {
    const entity =
        ticket.ownerType === 'user'
            ? await UserModel.findById(ticket.ownerId)
            : await BotModel.findById(ticket.ownerId);

    if (!entity) return null;

    return {
        playerType: ticket.ownerType as 'user' | 'bot',
        playerId: entity._id,
        name: entity.name,
        elo: entity.elo,
        avatarURL: entity.avatarURL,
        avatarFrameURL: entity.avatarFrameURL,
        userIcons: getPlayerIcons(entity),
        skillLevel:
            ticket.ownerType === 'bot' && 'skillLevel' in entity
                ? entity.skillLevel
                : null,
    };
}

export async function findGame(req: AuthRequest, res: Response) {
    try {
        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        const activeGame = await GameModel.findOne({
            status: 'active',
            $or: [
                { 'white.playerId': user._id },
                { 'black.playerId': user._id },
            ],
        });

        if (activeGame) {
            return res.status(200).json({
                status: 'in_game',
                game: activeGame,
            });
        }

        let ticket = await MatchTicketModel.findOne({
            ownerType: 'user',
            ownerId: user._id,
            status: 'searching',
        });

        if (!ticket) {
            ticket = await MatchTicketModel.create({
                ownerType: 'user',
                ownerId: user._id,
                elo: user.elo,
            });
        }

        const eloRange = getEloRange(ticket.searchStartedAt);

        const opponentTicket = await MatchTicketModel.findOne({
            _id: { $ne: ticket._id },
            status: 'searching',
            elo: {
                $gte: user.elo - eloRange,
                $lte: user.elo + eloRange,
            },
        }).sort({ createdAt: 1 });

        if (!opponentTicket) {
            return res.status(200).json({
                status: 'searching',
                eloRange,
            });
        }

        const firstPlayer = await getPlayerFromTicket(ticket);
        const secondPlayer = await getPlayerFromTicket(opponentTicket);

        if (!firstPlayer || !secondPlayer) {
            await MatchTicketModel.deleteMany({
                _id: {
                    $in: [ticket._id, opponentTicket._id],
                },
            });

            return res.status(200).json({
                status: 'searching',
                eloRange,
            });
        }

        const { firstSide, secondSide } = getRandomSides();

        const game = await GameModel.create({
            white: firstSide === 'white' ? firstPlayer : secondPlayer,
            black: secondSide === 'black' ? secondPlayer : firstPlayer,
            currentTurn: 'white',
            moves: [],
            status: 'active',
        });

        await MatchTicketModel.deleteMany({
            _id: {
                $in: [ticket._id, opponentTicket._id],
            },
        });

        if (firstPlayer.playerType === 'bot') {
            await BotModel.findByIdAndUpdate(firstPlayer.playerId, {
                status: 'playing',
            });
        }

        if (secondPlayer.playerType === 'bot') {
            await BotModel.findByIdAndUpdate(secondPlayer.playerId, {
                status: 'playing',
            });
        }

        return res.status(200).json({
            status: 'matched',
            game,
        });
    } catch (error) {
        console.log('Find game error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function cancelSearch(req: AuthRequest, res: Response) {
    try {
        await MatchTicketModel.deleteOne({
            ownerType: 'user',
            ownerId: req.userId,
            status: 'searching',
        });

        return res.status(200).json({
            message: 'Search cancelled',
        });
    } catch (error) {
        console.log('Cancel search error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function finishGame(req: AuthRequest, res: Response) {
    try {
        const { gameId, winner, finishedReason, moves } = req.body;

        const game = await GameModel.findById(gameId);

        if (!game) {
            return res.status(404).json({
                message: 'Game not found',
            });
        }

        if (game.status === 'finished') {
            return res.status(200).json({
                message: 'Game already finished',
                game,
            });
        }

        game.status = 'finished';
        game.winner = winner;
        game.finishedReason = finishedReason;
        game.moves = moves ?? [];

        await game.save();

        const players = [game.white, game.black];

        for (const player of players) {
            if (player.playerType === 'bot') {
                await BotModel.findByIdAndUpdate(player.playerId, {
                    status: 'idle',
                });

                scheduleBotSearch(player.playerId.toString());
            }
        }

        if (winner === 'white' || winner === 'black') {
            const loser = winner === 'white' ? game.black : game.white;
            const winnerPlayer = winner === 'white' ? game.white : game.black;

            if (winnerPlayer.playerType === 'user') {
                await UserModel.findByIdAndUpdate(winnerPlayer.playerId, {
                    $inc: { elo: 24 },
                });
            }

            if (loser.playerType === 'user') {
                await UserModel.findByIdAndUpdate(loser.playerId, {
                    $inc: { elo: -24 },
                });
            }

            if (winnerPlayer.playerType === 'bot') {
                await BotModel.findByIdAndUpdate(winnerPlayer.playerId, {
                    $inc: { elo: 24 },
                });
            }

            if (loser.playerType === 'bot') {
                await BotModel.findByIdAndUpdate(loser.playerId, {
                    $inc: { elo: -24 },
                });
            }
        }
        
        const updatedUser = await UserModel.findById(req.userId);

        return res.status(200).json({
            message: 'Game finished',
            game,
            user: updatedUser ? getPublicUser(updatedUser) : null,
        });
    } catch (error) {
        console.log('Finish game error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function getGameById(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const game = await GameModel.findById(id);

        if (!game) {
            return res.status(404).json({
                message: 'Game not found',
            });
        }

        return res.status(200).json({
            game,
        });
    } catch (error) {
        console.log('Get game by id error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function getActiveGame(req: AuthRequest, res: Response) {
    try {
        const activeGame = await GameModel.findOne({
            status: 'active',
            $or: [
                { 'white.playerId': req.userId },
                { 'black.playerId': req.userId },
            ],
        });

        return res.status(200).json({
            game: activeGame ?? null,
        });
    } catch (error) {
        console.log('Get active game error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}