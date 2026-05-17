import type { Board, Color, Move, Piece, Position } from './types';
import { BOARD_SIZE, cloneBoard, getPiece, inBounds } from './board';

const DIAGONALS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
] as const;

// Направления движения обычной шашки (вперёд)
function forwardDirs(color: Color): readonly (readonly [number, number])[] {
  return color === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

/**
 * Генерация ходов без взятия для одной шашки.
 */
export function getQuietMoves(
  board: Board,
  pos: Position,
  flyingKing: boolean
): Move[] {
  const piece = getPiece(board, pos);
  if (!piece) return [];

  const moves: Move[] = [];
  const dirs = piece.kind === 'king' ? DIAGONALS : forwardDirs(piece.color);

  for (const [dr, dc] of dirs) {
    if (piece.kind === 'king' && flyingKing) {
      // Дамка летает: идём вдоль диагонали, пока пусто
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c) && board[r][c] === null) {
        moves.push({
          from: pos,
          to: { row: r, col: c },
          captures: [],
          promotion: false,
        });
        r += dr;
        c += dc;
      }
    } else {
      // Обычный ход на 1 клетку
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (inBounds(r, c) && board[r][c] === null) {
        moves.push({
          from: pos,
          to: { row: r, col: c },
          captures: [],
          promotion: shouldPromoteAt(r, piece.color),
        });
      }
    }
  }
  return moves;
}

/**
 * Генерация взятий для одной шашки.
 * Возвращает СЕРИИ — то есть один Move может содержать несколько captures подряд.
 */
export function getCaptureMoves(
  board: Board,
  pos: Position,
  options: { manCanCaptureBackward: boolean; flyingKing: boolean }
): Move[] {
  const piece = getPiece(board, pos);
  if (!piece) return [];

  const result: Move[] = [];
  // Рекурсивный поиск всех цепочек взятий
  searchCaptures(
    board,
    pos,
    pos,
    piece,
    [],
    result,
    options
  );
  return result;
}

function searchCaptures(
  board: Board,
  startPos: Position,
  currentPos: Position,
  piece: Piece,
  capturedSoFar: Position[],
  result: Move[],
  opts: { manCanCaptureBackward: boolean; flyingKing: boolean }
) {
  const dirs =
    piece.kind === 'king' || opts.manCanCaptureBackward
      ? DIAGONALS
      : forwardDirs(piece.color);

  let foundContinuation = false;

  for (const [dr, dc] of dirs) {
    const captures = findCapturesInDirection(
      board,
      currentPos,
      piece,
      dr,
      dc,
      capturedSoFar,
      opts
    );

    for (const cap of captures) {
      foundContinuation = true;
      // Имитируем взятие на временной доске
      const tempBoard = cloneBoard(board);
      tempBoard[currentPos.row][currentPos.col] = null;
      tempBoard[cap.victim.row][cap.victim.col] = null;
      tempBoard[cap.landing.row][cap.landing.col] = piece;

      searchCaptures(
        tempBoard,
        startPos,
        cap.landing,
        piece,
        [...capturedSoFar, cap.victim],
        result,
        opts
      );
    }
  }

  // Если цепочка закончена (нет продолжения) и хоть кого-то съели — записываем
  if (!foundContinuation && capturedSoFar.length > 0) {
    result.push({
      from: startPos,
      to: currentPos,
      captures: capturedSoFar,
      promotion: shouldPromoteAt(currentPos.row, piece.color),
    });
  }
}

function findCapturesInDirection(
  board: Board,
  pos: Position,
  piece: Piece,
  dr: number,
  dc: number,
  alreadyCaptured: Position[],
  opts: { flyingKing: boolean }
): { victim: Position; landing: Position }[] {
  const out: { victim: Position; landing: Position }[] = [];

  if (piece.kind === 'king' && opts.flyingKing) {
    // Летающая дамка: ищем жертву вдоль диагонали, потом считаем посадочные клетки за ней
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (inBounds(r, c) && board[r][c] === null) {
      r += dr; c += dc;
    }
    if (!inBounds(r, c)) return out;
    const victim = board[r][c];
    if (!victim || victim.color === piece.color) return out;
    if (alreadyCaptured.some(p => p.row === r && p.col === c)) return out;

    let lr = r + dr;
    let lc = c + dc;
    while (inBounds(lr, lc) && board[lr][lc] === null) {
      out.push({ victim: { row: r, col: c }, landing: { row: lr, col: lc } });
      lr += dr; lc += dc;
    }
  } else {
    // Простое взятие через соседнюю клетку
    const vr = pos.row + dr;
    const vc = pos.col + dc;
    const lr = pos.row + 2 * dr;
    const lc = pos.col + 2 * dc;
    if (!inBounds(lr, lc)) return out;
    const victim = board[vr][vc];
    if (!victim || victim.color === piece.color) return out;
    if (board[lr][lc] !== null) return out;
    if (alreadyCaptured.some(p => p.row === vr && p.col === vc)) return out;
    out.push({ victim: { row: vr, col: vc }, landing: { row: lr, col: lc } });
  }
  return out;
}

function shouldPromoteAt(row: number, color: Color): boolean {
  return (color === 'white' && row === 0) || (color === 'black' && row === BOARD_SIZE - 1);
}

/**
 * Применить ход к доске. Возвращает новую доску.
 */
export function applyMoveToBoard(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  if (!piece) return next;

  next[move.from.row][move.from.col] = null;
  for (const cap of move.captures) {
    next[cap.row][cap.col] = null;
  }
  const finalPiece: Piece =
    move.promotion ? { ...piece, kind: 'king' } : piece;
  next[move.to.row][move.to.col] = finalPiece;

  return next;
}

/**
 * Все позиции шашек данного цвета.
 */
export function getPiecePositions(board: Board, color: Color): Position[] {
  const positions: Position[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const sq = board[r][c];
      if (sq && sq.color === color) positions.push({ row: r, col: c });
    }
  }
  return positions;
}