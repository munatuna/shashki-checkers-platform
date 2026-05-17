import type { Board, Color, Move } from '../types';
import {
  applyMoveToBoard,
  getCaptureMoves,
  getPiecePositions,
  getQuietMoves,
} from '../moves';
import type { RuleSet } from './index';
import { BOARD_SIZE } from '../board';

export const russianRules: RuleSet = {
  name: 'Русские шашки',
  description: 'Обязательное взятие. Дамка летает. Шашка бьёт назад.',
  manCanCaptureBackward: true,
  flyingKing: true,
  mandatoryCapture: true,

  getLegalMoves(board: Board, color: Color): Move[] {
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

    // Если есть взятия — только они (обязательное взятие)
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