import type { Board, Color, Move } from '../types';
import type { RuleSet } from '../rules';
import { applyMoveToBoard } from '../moves';
import { BOARD_SIZE } from '../board';

const MAN_VALUE  = 100;
const KING_VALUE = 320;

function evaluate(board: Board, botColor: Color): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const sq = board[r][c];
      if (!sq) continue;

      const base = sq.kind === 'king' ? KING_VALUE : MAN_VALUE;
      // Бонус за позицию ближе к центру
      const centerBonus = (3 - Math.abs(r - 3.5)) + (3 - Math.abs(c - 3.5));
      // Бонус за продвижение вперёд (для шашки)
      const advBonus = sq.kind === 'man'
        ? (sq.color === 'black' ? r * 3 : (7 - r) * 3)
        : 0;

      const val = base + centerBonus * 2 + advBonus;
      score += sq.color === botColor ? val : -val;
    }
  }
  return score;
}

function minimax(
  board: Board,
  rules: RuleSet,
  depth: number,
  color: Color,
  botColor: Color,
  alpha: number,
  beta: number,
): number {
  const moves = rules.getLegalMoves(board, color);

  if (moves.length === 0) return color === botColor ? -9999 : 9999;
  if (depth === 0) return evaluate(board, botColor);

  const next: Color = color === 'white' ? 'black' : 'white';
  const isMax = color === botColor;
  let best = isMax ? -Infinity : Infinity;

  for (const move of moves) {
    const nb = applyMoveToBoard(board, move);
    const val = minimax(nb, rules, depth - 1, next, botColor, alpha, beta);

    if (isMax) {
      if (val > best) best = val;
      if (val > alpha) alpha = val;
    } else {
      if (val < best) best = val;
      if (val < beta) beta = val;
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function getBotMove(board: Board, rules: RuleSet, botColor: Color, depth = 3): Move | null {
  const moves = rules.getLegalMoves(board, botColor);
  if (moves.length === 0) return null;

  const next: Color = botColor === 'white' ? 'black' : 'white';
  let bestMove = moves[0];
  let bestVal  = -Infinity;

  for (const move of moves) {
    const nb  = applyMoveToBoard(board, move);
    const val = minimax(nb, rules, depth - 1, next, botColor, -Infinity, Infinity);
    if (val > bestVal) { bestVal = val; bestMove = move; }
  }

  return bestMove;
}
