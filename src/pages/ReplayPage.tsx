import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { AppLayout } from '../components/layout/AppLayout';
import { supabase } from '../lib/supabase';
import { anthropic } from '../lib/anthropic';
import { createInitialBoard, getWinner } from '../engine/board';
import { getRules } from '../engine/rules/registry';
import { Piece } from '../components/board/Piece';
import { serializeBoard, serializeMoveHuman, serializeLegalMoves } from '../engine/serialize';
import type { Board, Move, Color } from '../engine/types';
import type { RuleVariant } from '../engine/types';

interface GameData {
  id: string;
  variant: string;
  winner: string | null;
  white_name: string | null;
  black_name: string | null;
  player_white: string | null;
  moves: Move[];
  created_at: string;
}

interface AnalysisMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  streaming?: boolean;
}

const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const BOARD_PX = 480;
const CELL = BOARD_PX / 8;

function buildBoardAt(moves: Move[], variant: RuleVariant, upTo: number): Board {
  const rules = getRules(variant);
  let board = createInitialBoard();
  let turn: Color = 'white';
  for (let i = 0; i < upTo; i++) {
    board = rules.applyMove(board, moves[i]);
    turn = turn === 'white' ? 'black' : 'white';
  }
  return board;
}

function getTurnAt(upTo: number): Color {
  return upTo % 2 === 0 ? 'white' : 'black';
}

function MiniBoard({ board, lastMove, t }: {
  board: Board;
  lastMove: Move | null;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
      width: BOARD_PX, height: BOARD_PX,
      borderRadius: 0, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {board.map((row, rIdx) =>
        row.map((piece, cIdx) => {
          const isDark = (rIdx + cIdx) % 2 === 1;
          const isFrom = lastMove && lastMove.from.row === rIdx && lastMove.from.col === cIdx;
          const isTo = lastMove && lastMove.to.row === rIdx && lastMove.to.col === cIdx;
          const isCaptured = lastMove && lastMove.captures.some(c => c.row === rIdx && c.col === cIdx);
          return (
            <div key={`${rIdx}-${cIdx}`} style={{
              background: isCaptured
                ? '#8b3a3a'
                : isFrom || isTo
                  ? (isDark ? '#aaa23a' : '#cdd16f')
                  : isDark ? '#b58863' : '#f0d9b5',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: CELL, height: CELL,
            }}>
              {piece && <Piece color={piece.color} kind={piece.kind} size={CELL * 0.82} />}
            </div>
          );
        })
      )}
    </div>
  );
}

export function ReplayPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();

  const [game, setGame] = useState<GameData | null>(null);
  const [step, setStep] = useState(0);
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [loading, setLoading] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? '';

  useEffect(() => {
    if (!gameId) return;
    supabase.from('games').select('*').eq('id', gameId).single().then(({ data }) => {
      if (data) setGame(data as GameData);
      setLoading(false);
    });
  }, [gameId]);

  useEffect(() => {
    if (!game) return;
    const variant = game.variant as RuleVariant;
    setBoard(buildBoardAt(game.moves, variant, step));
  }, [game, step]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-play
  useEffect(() => {
    if (!game || !autoPlay) {
      if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
      return;
    }
    autoRef.current = setInterval(() => {
      setStep(s => {
        if (s >= game.moves.length) { setAutoPlay(false); return s; }
        return s + 1;
      });
    }, 900);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [game, autoPlay]);

  const callAI = useCallback(async (userText: string) => {
    if (!game || aiLoading) return;
    setAiLoading(true);

    const variant = game.variant as RuleVariant;
    const myColor: Color = game.player_white === userId ? 'white' : 'black';
    const currentTurn = getTurnAt(step);
    const legalMoves = serializeLegalMoves(board, currentTurn, variant);
    const boardStr = serializeBoard(board);
    const movesPlayed = game.moves.slice(0, step).map(serializeMoveHuman).join(', ') || 'начало';
    const totalMoves = game.moves.length;
    const winner = game.winner;
    const whiteName = game.white_name ?? 'Белые';
    const blackName = game.black_name ?? 'Чёрные';

    const system = `Ты — тренер по шашкам, анализируешь сыгранную партию.
Правила: ${variant === 'russian' ? 'Русские' : variant === 'international' ? 'Международные' : 'Английские'}.
Игрок спрашивает за ${myColor === 'white' ? 'белых' : 'чёрных'}.
Нотация: столбцы a-h (a=левый), ряды 1-8 (1=нижний). W=белая, B=чёрная, ♛=дамка.
КРИТИЧЕСКИ ВАЖНО: советуй ТОЛЬКО ходы из списка ДОСТУПНЫХ ХОДОВ на текущей позиции.
Отвечай на русском, чётко и по делу. Максимум 3 предложения.`;

    const context = `ДОСКА (ход ${step} из ${totalMoves}):
${boardStr}

Партия: ${whiteName} (белые) vs ${blackName} (чёрные)
Ходы до этой позиции: ${movesPlayed}
Ход: ${currentTurn === 'white' ? 'белых' : 'чёрных'}
ДОСТУПНЫЕ ХОДЫ (${currentTurn === 'white' ? 'белых' : 'чёрных'}): ${legalMoves}
Итог партии: ${winner === 'draw' ? 'ничья' : winner === 'white' ? `победа ${whiteName}` : `победа ${blackName}`}

Вопрос: ${userText}`;

    const msgId = Date.now().toString();
    setMessages(prev => [...prev, { id: msgId, role: 'ai', text: '', streaming: true }]);

    try {
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system,
        messages: [{ role: 'user', content: context }],
      });
      let full = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          full += chunk.delta.text;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: full } : m));
        }
      }
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, streaming: false } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, text: 'Ошибка анализа. Проверь API ключ.', streaming: false }
        : m));
    } finally {
      setAiLoading(false);
    }
  }, [game, board, step, userId, aiLoading]);

  const handleSend = () => {
    if (!input.trim() || aiLoading) return;
    const text = input.trim();
    setMessages(prev => [...prev, { id: Date.now() + 'u', role: 'user', text }]);
    setInput('');
    callAI(text);
  };

  const handleAnalyzeMove = () => {
    if (!game || step === 0) return;
    const move = game.moves[step - 1];
    callAI(`Объясни ход ${serializeMoveHuman(move)}. Был ли он хорошим?`);
  };

  const handleAnalyzeGame = () => {
    callAI('Дай общий анализ партии. Где были ключевые ошибки?');
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: t.dim, fontSize: 14 }}>
          Загрузка партии...
        </div>
      </AppLayout>
    );
  }

  if (!game) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: t.muted, fontSize: 14 }}>
          Партия не найдена
        </div>
      </AppLayout>
    );
  }

  const variant = game.variant as RuleVariant;
  const lastMove = step > 0 ? game.moves[step - 1] : null;
  const currentMoveStr = lastMove ? serializeMoveHuman(lastMove) : '—';
  const myColor: Color = game.player_white === userId ? 'white' : 'black';

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: 10, minHeight: '100%' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.surface, boxShadow: t.topBar, borderRadius: 10, padding: '8px 14px',
        }}>
          <button onClick={() => navigate('/profile')}
            style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 13 }}>
            ← Профиль
          </button>
          <div style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>
            ▶ Разбор партии · {game.white_name} vs {game.black_name}
          </div>
          <div style={{ color: t.dim, fontSize: 12 }}>
            {new Date(game.created_at).toLocaleDateString('ru-RU')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

          {/* Center: board + controls */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

              {/* Player top (black) */}
              <div style={{
                width: BOARD_PX, display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 4px', borderRadius: 8,
                background: getTurnAt(step) === 'black' && step < game.moves.length ? t.greenDark : 'transparent',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1a1917', border: `2px solid ${t.border3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>●</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{game.black_name ?? 'Чёрные'}</div>
                </div>
                {getTurnAt(step) === 'black' && step < game.moves.length && (
                  <div style={{ color: t.green, fontSize: 12, fontWeight: 600 }}>● Ход</div>
                )}
              </div>

              {/* Board */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex' }}>
                  {/* Row labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: 18 }}>
                    {[8,7,6,5,4,3,2,1].map(n => (
                      <div key={n} style={{ height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.dim, fontSize: 10, fontWeight: 600 }}>{n}</div>
                    ))}
                  </div>
                  <MiniBoard board={board} lastMove={lastMove} t={t} />
                </div>
                {/* Col labels */}
                <div style={{ display: 'flex', marginLeft: 18 }}>
                  {COLS.map(c => (
                    <div key={c} style={{ width: CELL, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.dim, fontSize: 10, fontWeight: 600 }}>{c}</div>
                  ))}
                </div>
              </div>

              {/* Player bottom (white) */}
              <div style={{
                width: BOARD_PX, display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 4px', borderRadius: 8,
                background: getTurnAt(step) === 'white' && step < game.moves.length ? t.greenDark : 'transparent',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e8e6e3', border: `2px solid ${t.border3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>○</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{game.white_name ?? 'Белые'}</div>
                </div>
                {getTurnAt(step) === 'white' && step < game.moves.length && (
                  <div style={{ color: t.green, fontSize: 12, fontWeight: 600 }}>● Ход</div>
                )}
              </div>

              {/* Navigation controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: BOARD_PX }}>
                <button onClick={() => { setAutoPlay(false); setStep(0); }} style={navBtn(t)} title="В начало">⏮</button>
                <button onClick={() => { setAutoPlay(false); setStep(s => Math.max(0, s - 1)); }} style={navBtn(t)} title="Назад">◀</button>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>
                    {step === 0 ? 'Начало' : currentMoveStr}
                  </span>
                  <span style={{ color: t.dim, fontSize: 12, marginLeft: 8 }}>
                    {step} / {game.moves.length}
                  </span>
                </div>

                <button onClick={() => { setAutoPlay(false); setStep(s => Math.min(game.moves.length, s + 1)); }} style={navBtn(t)} title="Вперёд">▶</button>
                <button onClick={() => { setAutoPlay(false); setStep(game.moves.length); }} style={navBtn(t)} title="В конец">⏭</button>
                <button
                  onClick={() => setAutoPlay(a => !a)}
                  style={{ ...navBtn(t), background: autoPlay ? t.greenDark : t.surface2, color: autoPlay ? t.green : t.muted }}
                  title={autoPlay ? 'Пауза' : 'Авто-воспроизведение'}
                >
                  {autoPlay ? '⏸' : '▶▶'}
                </button>
              </div>

              {/* Move list */}
              <div style={{
                width: BOARD_PX, background: t.surface, boxShadow: t.card,
                borderRadius: 10, padding: 10, maxHeight: 120, overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {game.moves.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => { setAutoPlay(false); setStep(i + 1); }}
                      style={{
                        padding: '3px 8px', borderRadius: 5, border: 'none',
                        background: step === i + 1 ? t.green : t.surface2,
                        color: step === i + 1 ? '#fff' : t.muted,
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {i % 2 === 0 && <span style={{ opacity: 0.5, marginRight: 2 }}>{Math.floor(i / 2) + 1}.</span>}
                      {serializeMoveHuman(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI analysis */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Quick buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={handleAnalyzeMove} disabled={step === 0 || aiLoading} style={{
                padding: '10px 14px', borderRadius: 8, border: 'none',
                background: step > 0 && !aiLoading ? t.greenDark : t.surface2,
                color: step > 0 && !aiLoading ? t.green : t.dim,
                fontSize: 13, fontWeight: 700, cursor: step > 0 && !aiLoading ? 'pointer' : 'not-allowed',
                textAlign: 'left',
              }}>
                🔍 Объясни этот ход
              </button>
              <button onClick={handleAnalyzeGame} disabled={aiLoading} style={{
                padding: '10px 14px', borderRadius: 8, border: 'none',
                background: !aiLoading ? t.surface : t.surface2,
                color: !aiLoading ? t.blue : t.dim,
                fontSize: 13, fontWeight: 700, cursor: !aiLoading ? 'pointer' : 'not-allowed',
                textAlign: 'left', boxShadow: t.card,
              }}>
                📊 Общий анализ партии
              </button>
            </div>

            {/* Chat */}
            <div style={{
              background: t.surface, boxShadow: t.card, borderRadius: 12,
              display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 300,
            }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🤖</span>
                <span style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>AI Тренер</span>
                {aiLoading && <span style={{ color: t.dim, fontSize: 11 }}>анализирует...</span>}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                {messages.length === 0 && (
                  <div style={{ color: t.dim, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    Нажми кнопку выше или задай вопрос об этой позиции
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                    background: m.role === 'user' ? t.greenDark : t.surface2,
                    color: m.role === 'user' ? t.text : t.textSub,
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                  }}>
                    {m.text || (m.streaming ? <span style={{ color: t.dim }}>▋</span> : '')}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '8px 10px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 6 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Спроси об этой позиции..."
                  disabled={aiLoading}
                  style={{
                    flex: 1, background: t.surface2, border: 'none',
                    borderRadius: 7, padding: '7px 11px',
                    color: t.text, fontSize: 13,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || aiLoading}
                  style={{
                    width: 32, height: 32, borderRadius: 7, border: 'none',
                    background: input.trim() && !aiLoading ? t.green : t.surface2,
                    color: input.trim() && !aiLoading ? '#fff' : t.dim,
                    cursor: input.trim() && !aiLoading ? 'pointer' : 'not-allowed',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function navBtn(t: ReturnType<typeof useT>): React.CSSProperties {
  return {
    width: 34, height: 34, borderRadius: 7, border: 'none',
    background: t.surface2, color: t.muted,
    fontSize: 14, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  };
}
