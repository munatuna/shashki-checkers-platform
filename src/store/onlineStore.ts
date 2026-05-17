import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Move, RuleVariant, Position, Color, Board } from '../engine/types';
import { createInitialBoard, getWinner } from '../engine/board';
import { getQuietMoves, getCaptureMoves } from '../engine/moves';
import { getRules } from '../engine/rules/registry';

export type OnlineStatus = 'idle' | 'searching' | 'waiting_room' | 'playing' | 'finished';

export interface GameRow {
  id: string;
  room_code: string | null;
  variant: string;
  status: string;
  player_white: string | null;
  player_black: string | null;
  white_name: string | null;
  black_name: string | null;
  moves: Move[];
  winner: string | null;
  time_control?: string;
}

function replayGame(moves: Move[], variant: RuleVariant) {
  let board: Board = createInitialBoard();
  let turn: Color = 'white';
  const rules = getRules(variant);
  let winner: Color | 'draw' | null = null;
  for (const move of moves) {
    board = rules.applyMove(board, move);
    turn = turn === 'white' ? 'black' : 'white';
    const w = getWinner(board, turn, rules);
    if (w) { winner = w; break; }
  }
  return { board, turn, winner };
}

interface OnlineStore {
  gameId: string | null;
  roomCode: string | null;
  variant: RuleVariant;
  timeControl: string;
  status: OnlineStatus;
  moves: Move[];
  myColor: Color | null;
  opponentName: string | null;
  winner: Color | 'draw' | null;
  error: string | null;
  board: Board;
  turn: Color;
  selected: Position | null;
  legalMoves: Move[];

  findMatch: (variant: RuleVariant, userId: string, username: string, timeControl?: string) => Promise<void>;
  cancelSearch: (userId: string) => Promise<void>;
  createRoom: (variant: RuleVariant, userId: string, username: string, timeControl?: string) => Promise<void>;
  joinRoom: (code: string, userId: string, username: string) => Promise<boolean>;
  loadGame: (gameId: string, userId: string) => Promise<void>;
  selectSquare: (pos: Position) => void;
  sendMove: (move: Move) => Promise<void>;
  applyGameRow: (row: GameRow, userId: string) => void;
  reset: () => void;
}

const INIT = createInitialBoard();

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  gameId: null, roomCode: null, variant: 'russian', timeControl: 'unlimited', status: 'idle',
  moves: [], myColor: null, opponentName: null, winner: null, error: null,
  board: INIT, turn: 'white', selected: null, legalMoves: [],

  findMatch: async (variant, userId, username, timeControl = 'unlimited') => {
    set({ status: 'searching', variant, timeControl, error: null });
    try {
      // Clean stale entries
      await supabase.from('matchmaking_queue').delete()
        .lt('created_at', new Date(Date.now() - 120_000).toISOString());

      const { data: opp } = await supabase
        .from('matchmaking_queue').select('*')
        .eq('variant', variant).neq('user_id', userId)
        .order('created_at', { ascending: true }).limit(1).single();

      if (opp) {
        const { data: game, error } = await supabase.from('games').insert({
          variant, status: 'active',
          player_white: opp.user_id, player_black: userId,
          white_name: opp.username, black_name: username, moves: [],
          time_control: timeControl,
        }).select().single();

        if (!error && game) {
          await supabase.from('matchmaking_queue').delete().eq('user_id', opp.user_id);
          set({
            gameId: game.id, myColor: 'black', status: 'playing',
            opponentName: opp.username as string,
            board: INIT, turn: 'white', moves: [],
          });
          return;
        }
      }
      await supabase.from('matchmaking_queue').upsert({ user_id: userId, username, variant });
    } catch {
      set({ error: 'Ошибка поиска', status: 'idle' });
    }
  },

  cancelSearch: async (userId) => {
    await supabase.from('matchmaking_queue').delete().eq('user_id', userId);
    set({ status: 'idle' });
  },

  createRoom: async (variant, userId, username, timeControl = 'unlimited') => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const { data: game, error } = await supabase.from('games').insert({
        room_code: code, variant, status: 'waiting',
        player_white: userId, white_name: username, moves: [],
        time_control: timeControl,
      }).select().single();
      if (error || !game) { set({ error: 'Ошибка создания комнаты' }); return; }
      set({
        gameId: game.id, roomCode: code, variant, timeControl, myColor: 'white',
        status: 'waiting_room', board: INIT, turn: 'white', moves: [],
      });
    } catch {
      set({ error: 'Ошибка создания комнаты' });
    }
  },

  joinRoom: async (code, userId, username) => {
    try {
      const { data: game } = await supabase.from('games').select('*')
        .eq('room_code', code.toUpperCase()).eq('status', 'waiting').single();
      if (!game) { set({ error: 'Комната не найдена или уже занята' }); return false; }

      const { error } = await supabase.from('games')
        .update({ player_black: userId, black_name: username, status: 'active' })
        .eq('id', game.id);
      if (error) { set({ error: 'Не удалось войти' }); return false; }

      const g = game as GameRow;
      set({
        gameId: g.id, roomCode: code.toUpperCase(), variant: g.variant as RuleVariant,
        myColor: 'black', opponentName: g.white_name,
        status: 'playing', board: INIT, turn: 'white', moves: [],
      });
      return true;
    } catch {
      set({ error: 'Ошибка подключения' });
      return false;
    }
  },

  loadGame: async (gameId, userId) => {
    const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (!data) { set({ error: 'Игра не найдена' }); return; }
    const row = data as GameRow;
    const variant = row.variant as RuleVariant;
    const timeControl = row.time_control ?? 'unlimited';
    const moves = (row.moves || []) as Move[];
    const { board, turn, winner } = replayGame(moves, variant);
    const myColor: Color = row.player_white === userId ? 'white' : 'black';
    set({
      gameId: row.id, roomCode: row.room_code, variant, timeControl, myColor,
      opponentName: myColor === 'white' ? row.black_name : row.white_name,
      status: row.status === 'finished' ? 'finished' : row.status === 'waiting' ? 'waiting_room' : 'playing',
      moves, board, turn,
      winner: winner ?? (row.winner as Color | 'draw' | null),
    });
  },

  selectSquare: (pos) => {
    const { board, turn, myColor, status, selected, legalMoves, winner, variant } = get();
    if (status !== 'playing' || winner || turn !== myColor) return;
    const rules = getRules(variant);
    if (selected) {
      const move = legalMoves.find(
        m => m.from.row === selected.row && m.from.col === selected.col &&
             m.to.row === pos.row && m.to.col === pos.col
      );
      if (move) { get().sendMove(move); return; }
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

  sendMove: async (move) => {
    const { moves, variant, gameId } = get();
    if (!gameId) return;
    const newMoves = [...moves, move];
    const { board, turn, winner } = replayGame(newMoves, variant);
    set({ moves: newMoves, board, turn, winner, selected: null, legalMoves: [] });
    await supabase.from('games').update({
      moves: newMoves,
      status: winner ? 'finished' : 'active',
      winner: winner ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', gameId);
    if (winner) {
      supabase.rpc('update_elo_after_game', { game_id: gameId }).then(() => {});
    }
  },

  applyGameRow: (row, userId) => {
    const { moves: local, variant } = get();
    const remote = (row.moves || []) as Move[];
    if (remote.length <= local.length) {
      // Maybe opponent just joined (status changed to active)
      if (row.status === 'active' && row.player_black) {
        const myColor: Color = row.player_white === userId ? 'white' : 'black';
        set({
          status: 'playing',
          opponentName: myColor === 'white' ? row.black_name : row.white_name,
        });
      }
      return;
    }
    const { board, turn, winner } = replayGame(remote, variant);
    const finalWinner = winner ?? (row.winner as Color | 'draw' | null);
    set({
      moves: remote, board, turn,
      winner: finalWinner,
      status: row.status === 'finished' ? 'finished' : 'playing',
      selected: null, legalMoves: [],
    });
    if (finalWinner && row.id) {
      supabase.rpc('update_elo_after_game', { game_id: row.id }).then(() => {});
    }
  },

  reset: () => set({
    gameId: null, roomCode: null, status: 'idle', moves: [],
    timeControl: 'unlimited', myColor: null, opponentName: null, winner: null, error: null,
    board: INIT, turn: 'white', selected: null, legalMoves: [],
  }),
}));
