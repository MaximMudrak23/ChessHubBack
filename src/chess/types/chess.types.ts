export type Side = 'white' | 'black';

export type Color = 'w' | 'b';

export type PieceName = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

export type PromotionPiece = Exclude<PieceName, 'p' | 'k'>;

export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PieceCode = `${Color}${PieceName}`;

export type Square = `${File}${Rank}`;

export type GameStatus =
    | 'playing'
    | 'checkmate'
    | 'stalemate'
    | 'fifty-move-draw'
    | 'threefold-repetition-draw'
    | 'insufficient-material-draw';

export type PieceType = {
    id: string;
    piece: PieceCode;
    square: Square;
    hasMoved?: boolean;
};

export type LastMove = {
    piece: PieceCode;
    from: Square;
    to: Square;
} | null;