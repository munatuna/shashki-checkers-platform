import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, DIFFICULTY_LABEL } from '../store/gameStore';
import type { Difficulty } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';
import { Board } from '../components/board/Board';
import { CoachPanel } from '../components/coach/CoachPanel';
import type { CoachMessage } from '../components/coach/CoachPanel';
import { anthropic } from '../lib/anthropic';
import { serializeBoard, serializeMoveHuman, serializeLegalMoves, serializePieceList } from '../engine/serialize';
import type { RuleVariant } from '../engine/types';

const CELL = 560 / 8;

function variantLabel(v: RuleVariant) {
  if (v === 'russian')       return 'Русские';
  if (v === 'international') return 'Международные';
  return 'Английские';
}

function getExperienceLabel(exp: string | undefined) {
  if (exp === 'beginner')     return 'начинающий, не знает правил';
  if (exp === 'casual')       return 'знает основы';
  if (exp === 'intermediate') return 'знает стратегии';
  if (exp === 'tournament')   return 'соревновательный уровень';
  return 'неизвестный уровень';
}


function BoardWithCoords({ t }: { t: ReturnType<typeof useT> }) {
  const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rows = [8, 7, 6, 5, 4, 3, 2, 1];
  const label: React.CSSProperties = {
    color: t.dim, fontSize: 11, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 18 }}>
          {rows.map(n => <div key={n} style={{ ...label, height: CELL }}>{n}</div>)}
        </div>
        <Board />
      </div>
      <div style={{ display: 'flex', marginLeft: 18 }}>
        {cols.map(c => <div key={c} style={{ ...label, width: CELL, height: 18 }}>{c}</div>)}
      </div>
    </div>
  );
}

function PlayerRow({ name, color, isActive, thinking, t }: {
  name: string; color: 'white' | 'black'; isActive: boolean; thinking: boolean;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div style={{
      width: 560 + 18,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 4px', borderRadius: 8,
      background: isActive ? t.greenDark : 'transparent',
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: color === 'white' ? '#e8e6e3' : '#1a1917',
        border: `2px solid ${isActive ? t.green : t.border3}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>
        {color === 'white' ? '○' : '●'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: isActive ? t.text : t.muted, fontSize: 14, fontWeight: 600 }}>{name}</div>
        <div style={{ color: t.dim, fontSize: 11 }}>{color === 'white' ? 'Белые' : 'Чёрные'}</div>
      </div>
      {isActive && (
        <div style={{ color: thinking ? t.orange : t.green, fontSize: 12, fontWeight: 600, paddingRight: 8 }}>
          {thinking ? '⏳ Думает...' : '● Ваш ход'}
        </div>
      )}
    </div>
  );
}

export function CoachPage() {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();
  const { board, turn, winner, history, variant, botColor, botThinking, difficulty, newGame } = useGameStore();

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hintReady, setHintReady] = useState(false);
  const prevHistoryLen = useRef(0);
  const messagesRef = useRef<CoachMessage[]>([]);
  messagesRef.current = messages;

  const experience = user?.user_metadata?.experience as string | undefined;
  const username = (user?.user_metadata?.username as string | undefined) ?? 'Игрок';
  const playerColor = botColor === 'black' ? 'white' : 'black';
  const isPlayerTurn = !winner && turn !== botColor && !botThinking;

  useEffect(() => {
    newGame('russian', 'bot', difficulty);
    return () => {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const len = history.length;
    if (len > prevHistoryLen.current) {
      prevHistoryLen.current = len;
      if (!winner && turn === botColor) setHintReady(true);
      if (winner) {
        setHintReady(false);
        const res = winner === 'draw' ? 'ничья' : winner === playerColor ? 'победа' : 'поражение';
        callCoach(`Партия завершена — ${res}. Дай краткий итог и один совет.`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, turn, winner]);

  const callCoach = useCallback(async (userPrompt: string) => {
    if (loading) return;
    setLoading(true); setHintReady(false);

    const legalMoves = serializeLegalMoves(board, playerColor, variant);
    const whitePieces = serializePieceList(board, 'white');
    const blackPieces = serializePieceList(board, 'black');
    const lastMoves = history.slice(-4).map(serializeMoveHuman).join(', ');

    const system = `Ты — коуч по шашкам. Правила: ${variantLabel(variant)}. Уровень игрока: ${getExperienceLabel(experience)}.
КРИТИЧЕСКИ ВАЖНО: Советуй ТОЛЬКО ходы из списка ДОСТУПНЫХ ХОДОВ. Никогда не предлагай ход, которого нет в этом списке — это будет грубой ошибкой.
Нотация: столбцы a-h (a=левый), ряды 1-8 (1=нижний). W=белая шашка, B=чёрная, ♛=дамка.
Отвечай только на русском. Максимум 2 предложения. Не повторяй вопрос.`;

    const boardStr = serializeBoard(board);
    const contextMsg = `ДОСКА (W=белые, B=чёрные):
${boardStr}

Белые фигуры: ${whitePieces}
Чёрные фигуры: ${blackPieces}
Последние ходы: ${lastMoves || 'начало партии'}
Ходов сыграно: ${history.length}

ДОСТУПНЫЕ ХОДЫ БЕЛЫХ (только из этого списка): ${legalMoves}

Вопрос: ${userPrompt}`;

    const apiMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const m of messagesRef.current.slice(-6)) {
      apiMessages.push({ role: m.role === 'player' ? 'user' : 'assistant', content: m.text });
    }
    apiMessages.push({ role: 'user', content: contextMsg });

    const msgId = Date.now().toString() + Math.random();
    setMessages(prev => [...prev, { id: msgId, role: 'coach', text: '', streaming: true }]);

    try {
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150, system, messages: apiMessages,
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
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m, text: 'Ошибка. Проверь VITE_ANTHROPIC_API_KEY в .env.local', streaming: false,
      } : m));
    } finally { setLoading(false); }
  }, [board, history, variant, experience, loading]);

  const handleHint = () => {
    const last = history.at(-1);
    const moveStr = last ? `после хода ${serializeMoveHuman(last)}` : '';
    callCoach(`Что лучше сделать дальше ${moveStr}?`);
  };

  const handleReset = (d?: Difficulty) => {
    newGame(variant, 'bot', d ?? difficulty);
    setMessages([]); setHintReady(false); prevHistoryLen.current = 0;
  };

  const handlePlayerSend = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'player', text }]);
    callCoach(text);
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: 10, minHeight: '100%' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.surface, boxShadow: t.topBar, borderRadius: 10, padding: '8px 14px',
        }}>
          <button onClick={() => navigate('/home')}
            style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 13 }}>
            ← Меню
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: t.green, fontWeight: 600, marginRight: 4 }}>🎓 Коуч</span>
            {(['russian', 'international', 'english'] as RuleVariant[]).map(v => (
              <button key={v}
                onClick={() => { newGame(v, 'bot', difficulty); setMessages([]); prevHistoryLen.current = 0; }}
                style={{
                  padding: '3px 10px', borderRadius: 5,
                  border: `1px solid ${variant === v ? t.green : t.border3}`,
                  background: variant === v ? t.greenDark : 'transparent',
                  color: variant === v ? t.green : t.dim,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                {variantLabel(v)}
              </button>
            ))}
            <span style={{ color: t.border2, margin: '0 4px' }}>|</span>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => handleReset(d)}
                style={{
                  padding: '3px 10px', borderRadius: 5,
                  border: `1px solid ${difficulty === d ? t.orange : t.border3}`,
                  background: difficulty === d ? t.orangeDark : 'transparent',
                  color: difficulty === d ? t.orange : t.dim,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
          <button onClick={() => handleReset()}
            style={{ background: t.surface2, borderRadius: 6, border: 'none', color: t.muted, fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>
            Новая
          </button>
        </div>

        {/* Main: board CENTER, coach RIGHT */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

          {/* Center: board */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <PlayerRow name="🤖 Бот" color="black" isActive={turn === botColor && !winner} thinking={botThinking} t={t} />

            <div style={{ position: 'relative' }}>
              <BoardWithCoords t={t} />
              {winner && (
                <div style={{
                  position: 'absolute', inset: '0 0 18px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.6)', borderRadius: 6,
                }}>
                  <div style={{ background: t.greenDark, boxShadow: t.card, borderRadius: 12, padding: '18px 30px', textAlign: 'center' }}>
                    <div style={{ color: t.green, fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                      {winner === 'draw' ? '🤝 Ничья!' : winner === playerColor ? '🏆 Победа!' : '😔 Поражение'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button onClick={() => handleReset()}
                        style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: t.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Реванш
                      </button>
                      <button onClick={() => navigate('/home')}
                        style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${t.border3}`, background: 'transparent', color: t.text, fontSize: 13, cursor: 'pointer' }}>
                        В меню
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <PlayerRow name={username} color="white" isActive={isPlayerTurn} thinking={false} t={t} />
          </div>
          </div>

          {/* Right: hint button + coach panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 300, flexShrink: 0 }}>
            <button
              onClick={handleHint}
              disabled={!hintReady || loading}
              style={{
                padding: '10px 16px', borderRadius: 8,
                border: `2px solid ${hintReady && !loading ? t.green : t.border2}`,
                background: hintReady && !loading ? t.greenDark : t.surface,
                color: hintReady && !loading ? t.green : t.dim,
                fontSize: 13, fontWeight: 700,
                cursor: hintReady && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              💡 {hintReady && !loading ? 'Получить подсказку' : loading ? 'Коуч думает...' : 'Сделай ход'}
            </button>
            <CoachPanel messages={messages} loading={loading} onSend={handlePlayerSend} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
