import type { Move } from '../types';
import {
  applyMoveToBoard,
  getCaptureMoves,
  getPiecePositions,
  getQuietMoves,
} from '../moves';
import type { RuleSet } from './index';
import { BOARD_SIZE } from '../board';

export const englishRules: RuleSet = {
  name: 'Английские шашки',
  description: 'Обязательное взятие. Шашка бьёт только вперёд. Дамка на 1 клетку.',
  manCanCaptureBackward: false,
  flyingKing: false,
  mandatoryCapture: true,

  getLegalMoves(board, color) {
    const positions = getPiecePositions(board, color);
    const captures: Move[] = [];
    const quiet: Move[] = [];

    for (const pos of positions) {
      captures.push(
        ...getCaptureMoves(board, pos, {
          manCanCaptureBackward: false,
          flyingKing: false,
        })
      );
      quiet.push(...getQuietMoves(board, pos, false));
    }
    return captures.length > 0 ? captures : quiet;
  },

  applyMove(board, move) {
    return applyMoveToBoard(board, move);
  },

  shouldPromote(pos, color) {
    return (color === 'white' && pos.row === 0) ||
           (color === 'black' && pos.row === BOARD_SIZE - 1);
  },
};