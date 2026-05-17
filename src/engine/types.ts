export type Color = 'white' | 'black';
export type PieceKind = 'man' | 'king';
export type RuleVariant = 'russian' | 'international' | 'english';

export interface Piece {
  color: Color;
  kind: PieceKind;
}

// null = пустая клетка
export type Square = Piece | null;
export type Board = Square[][]; // [row][col], 8x8

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures: Position[]; // позиции взятых шашек (для серии)
  promotion: boolean;   // превращается ли в дамку
}

export interface GameState {
  board: Board;
  turn: Color;
  variant: RuleVariant;
  history: Move[];
  winner: Color | 'draw' | null;
}