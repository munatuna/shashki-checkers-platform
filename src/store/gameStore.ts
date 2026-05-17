import { create } from 'zustand';
import type { Board, Color, Move, Position, RuleVariant } from '../engine/types';
import { createInitialBoard, getWinner } from '../engine/board';
import { getQuietMoves, getCaptureMoves } from '../engine/moves';
import { getRules } from '../engine/rules/registry';
import { getBotMove } from '../engine/ai/bot';

export type GameMode = 'local' | 'bot';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy:   1,
  medium: 3,
  hard:   5,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy:   'Лёгкий',
  medium: 'Средний',
  hard:   'Сложный',
};

export interface GameRecord {
  id: string;
  variant: RuleVariant;
  mode: GameMode;
  result: 'win' | 'loss' | 'draw';
  moves: number;
  date: string;
  opponent: string;
}

const HISTORY_KEY = 'shashki_history';

export function loadGameHistory(): GameRecord[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as GameRecord[];
  } catch {
    return [];
  }
}

function saveGameRecord(record: GameRecord) {
  const history = loadGameHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 100)));
}

interface GameStore {
  board: Board;
  turn: Color;
  variant: RuleVariant;
  mode: GameMode;
  difficulty: Difficulty;
  botColor: Color;
  botThinking: boolean;
  selected: Position | null;
  legalMoves: Move[];
  history: Move[];
  winner: Color | 'draw' | null;

  selectSquare: (pos: Position) => void;
  makeMove: (move: Move) => void;
  newGame: (variant?: RuleVariant, mode?: GameMode, difficulty?: Difficulty) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  board: createInitialBoard(),
  turn: 'white',
  variant: 'russian',
  mode: 'local',
  difficulty: 'medium',
  botColor: 'black',
  botThinking: false,
  selected: null,
  legalMoves: [],
  history: [],
  winner: null,

  selectSquare: (pos) => {
    const { board, turn, variant, selected, legalMoves, mode, botColor, winner } = get();
    if (winner) return;
    if (mode === 'bot' && turn === botColor) return;

    const rules = getRules(variant);

    if (selected) {
      const move = legalMoves.find(
        m => m.from.row === selected.row && m.from.col === selected.col &&
             m.to.row === pos.row && m.to.col === pos.col
      );
      if (move) {
        get().makeMove(move);
        return;
      }
    }

    const piece = board[pos.row][pos.col];
    if (piece && piece.color === turn) {
      const captures = getCaptureMoves(board, pos, {
        manCanCaptureBackward: rules.manCanCaptureBackward,
        flyingKing: rules.flyingKing,
      });
      const quiet = getQuietMoves(board, pos, rules.flyingKing);
      set({ selected: pos, legalMoves: [...captures, ...quiet] });
    } else {
      set({ selected: null, legalMoves: [] });
    }
  },

  makeMove: (move) => {
    const { board, turn, variant, history, mode, botColor, botThinking, difficulty } = get();
    if (botThinking) return;

    const rules    = getRules(variant);
    const nextBoard = rules.applyMove(board, move);
    const nextTurn: Color = turn === 'white' ? 'black' : 'white';
    const winner   = getWinner(nextBoard, nextTurn, rules);

    set({
      board: nextBoard,
      turn: nextTurn,
      history: [...history, move],
      selected: null,
      legalMoves: [],
      winner,
    });

    if (winner) {
      const playerColor: Color = mode === 'bot' ? (botColor === 'black' ? 'white' : 'black') : 'white';
      const result: GameRecord['result'] =
        winner === 'draw' ? 'draw' :
        winner === playerColor ? 'win' : 'loss';
      saveGameRecord({
        id: Date.now().toString(),
        variant,
        mode,
        result,
        moves: history.length + 1,
        date: new Date().toLocaleDateString('ru-RU'),
        opponent: mode === 'bot' ? 'Бот' : 'Локальный игрок',
      });
      return;
    }

    if (mode === 'bot' && nextTurn === botColor) {
      set({ botThinking: true });
      const depth = DIFFICULTY_DEPTH[difficulty];
      setTimeout(() => {
        const { board: currentBoard, variant: currentVariant } = get();
        const currentRules = getRules(currentVariant);
        const botMove = getBotMove(currentBoard, currentRules, botColor, depth);
        set({ botThinking: false });
        if (botMove) get().makeMove(botMove);
      }, 400);
    }
  },

  newGame: (variant, mode, difficulty) => {
    set({
      board: createInitialBoard(),
      turn: 'white',
      variant:    variant    ?? get().variant,
      mode:       mode       ?? get().mode,
      difficulty: difficulty ?? get().difficulty,
      botColor: 'black',
      botThinking: false,
      selected: null,
      legalMoves: [],
      history: [],
      winner: null,
    });
  },
}));
