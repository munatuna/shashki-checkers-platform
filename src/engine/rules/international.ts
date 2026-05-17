import type { Move } from '../types';
import {
  applyMoveToBoard,
  getCaptureMoves,
  getPiecePositions,
  getQuietMoves,
} from '../moves';
import type { RuleSet } from './index';
import { BOARD_SIZE } from '../board';

// Упрощённый вариант 8x8 (классические международные на 10x10, но у нас доска 8x8)
export const internationalRules: RuleSet = {
  name: 'Международные шашки',
  description: 'Шашка бьёт назад. Дамка летает. Обязательно бить максимум шашек.',
  manCanCaptureBackward: true,
  flyingKing: true,
  mandatoryCapture: true,

  getLegalMoves(board, color) {
    const positions = getPiecePositions(board, color);
    const captures: Move[] = [];
    const quiet: Move[] = [];

    for (const pos of positions) {
      captures.push(
        ...getCaptureMoves(board, pos, {
          manCanCaptureBackward: true,
          flyingKing: true,
        })
      );
      quiet.push(...getQuietMoves(board, pos, true));
    }

    if (captures.length > 0) {
      // Правило большинства: брать надо максимальное количество шашек
      const max = Math.max(...captures.map(m => m.captures.length));
      return captures.filter(m => m.captures.length === max);
    }
    return quiet;
  },

  applyMove(board, move) {
    return applyMoveToBoard(board, move);
  },

  shouldPromote(pos, color) {
    return (color === 'white' && pos.row === 0) ||
           (color === 'black' && pos.row === BOARD_SIZE - 1);
  },
};