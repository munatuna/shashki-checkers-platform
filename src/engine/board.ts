import type { Board, Color, Piece } from './types';

export const BOARD_SIZE = 8;

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  // Шашки стоят только на тёмных клетках: (row + col) % 2 === 1
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', kind: 'man' };
      }
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'white', kind: 'man' };
      }
    }
  }
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(sq => (sq ? { ...sq } : null)));
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getPiece(board: Board, pos: { row: number; col: number }): Piece | null {
  return board[pos.row]?.[pos.col] ?? null;
}

export function countPieces(board: Board, color: Color): number {
  let count = 0;
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.color === color) count++;
    }
  }
  return count;
}

import type { RuleSet } from './rules';

export function getWinner(
  board: Board,
  turn: Color,
  rules: RuleSet
): Color | 'draw' | null {
  const whiteCount = countPieces(board, 'white');
  const blackCount = countPieces(board, 'black');

  if (whiteCount === 0) return 'black';
  if (blackCount === 0) return 'white';

  // Если у того, чей ход — нет легальных ходов = он проиграл
  const moves = rules.getLegalMoves(board, turn);
  if (moves.length === 0) return turn === 'white' ? 'black' : 'white';

  return null;
}