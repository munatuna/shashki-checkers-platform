import type { Board, Color, Move, Position } from '../types';

export interface RuleSet {
  name: string;
  description: string;

  // Может ли обычная шашка бить назад
  manCanCaptureBackward: boolean;

  // Дамка ходит на любое расстояние (как ферзь) или на 1 клетку
  flyingKing: boolean;

  // Обязательно ли брать, если можно
  mandatoryCapture: boolean;

  // Все легальные ходы для данного цвета
  getLegalMoves(board: Board, color: Color): Move[];

  // Применить ход — вернуть новую доску
  applyMove(board: Board, move: Move): Board;

  // Проверка превращения в дамку для позиции
  shouldPromote(pos: Position, color: Color): boolean;
}