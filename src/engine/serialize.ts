import type { Board, Move, Color } from './types';
import { getCaptureMoves, getQuietMoves, getPiecePositions } from './moves';
import type { RuleVariant } from './types';
import { getRules } from './rules/registry';

const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function serializeMoveHuman(move: Move): string {
  const from = `${COLS[move.from.col]}${8 - move.from.row}`;
  const to = `${COLS[move.to.col]}${8 - move.to.row}`;
  return move.captures.length > 0 ? `${from}×${to}` : `${from}-${to}`;
}

export function serializeBoard(board: Board): string {
  const lines: string[] = [`  ${COLS.join(' ')}`];
  for (let r = 0; r < 8; r++) {
    const cells = board[r].map(sq => {
      if (!sq) return '.';
      if (sq.color === 'white') return sq.kind === 'king' ? 'W♛' : 'W';
      return sq.kind === 'king' ? 'B♛' : 'B';
    });
    lines.push(`${8 - r} ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

export function serializeLegalMoves(board: Board, color: Color, variant: RuleVariant): string {
  const rules = getRules(variant);
  const positions = getPiecePositions(board, color);

  const captures: Move[] = [];
  const quiets: Move[] = [];
  for (const pos of positions) {
    captures.push(...getCaptureMoves(board, pos, {
      manCanCaptureBackward: rules.manCanCaptureBackward,
      flyingKing: rules.flyingKing,
    }));
    quiets.push(...getQuietMoves(board, pos, rules.flyingKing));
  }

  const legal = captures.length > 0 ? captures : quiets;
  if (legal.length === 0) return 'нет доступных ходов';
  return legal.map(serializeMoveHuman).join(', ');
}

export function serializePieceList(board: Board, color: Color): string {
  const positions = getPiecePositions(board, color);
  return positions.map(p => {
    const piece = board[p.row][p.col]!;
    const sq = `${COLS[p.col]}${8 - p.row}`;
    return piece.kind === 'king' ? `${sq}(дамка)` : sq;
  }).join(', ');
}
