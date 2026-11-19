import type { Types } from 'mongoose';

type HistoryPlayer = {
    playerType: 'user' | 'bot';
    playerId: Types.ObjectId;
    name?: string | null;
    avatarURL?: string | null;
    elo?: number | null;
};

export type GameHistoryRecord = {
    _id: Types.ObjectId;
    white: HistoryPlayer;
    black: HistoryPlayer;
    winner: 'white' | 'black' | 'draw';
    movesCount: number;
    finishedAt: Date;
};

function getHistoryPlayerDTO(player: HistoryPlayer) {
    return {
        name: player.name ?? null,
        avatarURL: player.avatarURL ?? null,
        elo: player.elo ?? null,
    };
}

export function getGameHistoryDTO(game: GameHistoryRecord, userID: string) {
    const userSide = game.white.playerType === 'user' && String(game.white.playerId) === userID
        ? 'white'
        : 'black';
    const result = game.winner === 'draw' ? 'draw' : game.winner === userSide ? 'win' : 'loss';

    return {
        id: String(game._id),
        white: getHistoryPlayerDTO(game.white),
        black: getHistoryPlayerDTO(game.black),
        result,
        movesCount: game.movesCount,
        finishedAt: game.finishedAt.toISOString(),
    };
}
