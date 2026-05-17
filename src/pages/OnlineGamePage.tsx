import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOnlineStore } from '../store/onlineStore';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';
import { OnlineBoard } from '../components/board/OnlineBoard';
import { supabase } from '../lib/supabase';
import type { GameRow } from '../store/onlineStore';
import type { RuleVariant, Color } from '../engine/types';

function parseTC(tc: string): { baseMs: number; incMs: number } | null {
  if (!tc || tc === 'unlimited') return null;
  const parts = tc.split('+');
  return { baseMs: parseInt(parts[0]) * 60_000, incMs: (parseInt(parts[1]) || 0) * 1_000 };
}

function Clock({ ms, isActive, t }: { ms: number; isActive: boolean; t: ReturnType<typeof useT> }) {
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1_000);
  const low = ms < 30_000 && ms > 0;
  return (
    <div style={{
      background: isActive ? (low ? '#c73c3c' : t.green) : t.surface2,
      color: isActive ? '#fff' : t.muted,
      borderRadius: 8, padding: '6px 16px',
      fontSize: 22, fontWeight: 900, fontFamily: 'monospace',
      minWidth: 80, textAlign: 'center',
      transition: 'background 0.3s',
      boxShadow: isActive ? `0 0 12px ${low ? '#c73c3c' : t.green}55` : 'none',
    }}>
      {min}:{String(sec).padStart(2, '0')}
    </div>
  );
}

function variantLabel(v: RuleVariant) {
  if (v === 'russian')       return 'Русские';
  if (v === 'international') return 'Международные';
  return 'Английские';
}

function PlayerRow({ name, color, isActive, timeMs, t }: {
  name: string; color: 'white' | 'black'; isActive: boolean;
  timeMs: number | null; t: ReturnType<typeof useT>;
}) {
  return (
    <div style={{
      width: '100%', maxWidth: 640,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 4px', borderRadius: 8,
      background: isActive ? t.greenDark : 'transparent',
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
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
      {isActive && timeMs === null && (
        <div style={{ color: t.green, fontSize: 12, fontWeight: 600, paddingRight: 8 }}>● Ваш ход</div>
      )}
      {timeMs !== null && <Clock ms={timeMs} isActive={isActive} t={t} />}
    </div>
  );
}

export function OnlineGamePage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();
  const {
    variant, status, myColor, opponentName, turn, winner,
    timeControl, moves,
    loadGame, applyGameRow, reset,
  } = useOnlineStore();

  const userId = user?.id ?? '';
  const username = (user?.user_metadata?.username as string | undefined) ?? 'Вы';
  const myColorSafe = myColor ?? 'white';
  const oppColor: 'white' | 'black' = myColorSafe === 'white' ? 'black' : 'white';
  const isMyTurn = turn === myColorSafe && !winner && status === 'playing';

  // Timer state
  const [clockWhite, setClockWhite] = useState<number | null>(null);
  const [clockBlack, setClockBlack] = useState<number | null>(null);
  const prevMovesLen = useRef(0);
  const timedOutRef = useRef(false);

  // Initialize clocks when game/timeControl is known
  useEffect(() => {
    const parsed = parseTC(timeControl);
    if (!parsed) { setClockWhite(null); setClockBlack(null); return; }
    setClockWhite(parsed.baseMs);
    setClockBlack(parsed.baseMs);
    prevMovesLen.current = 0;
    timedOutRef.current = false;
  }, [timeControl, gameId]);

  // Add increment when a move happens
  useEffect(() => {
    const newLen = moves.length;
    if (newLen <= prevMovesLen.current) return;
    const parsed = parseTC(timeControl);
    if (parsed && parsed.incMs > 0) {
      // turn has already flipped — the player who just moved is the opposite of current turn
      const justMoved: Color = turn === 'white' ? 'black' : 'white';
      if (justMoved === 'white') setClockWhite(p => p !== null ? p + parsed.incMs : null);
      else setClockBlack(p => p !== null ? p + parsed.incMs : null);
    }
    prevMovesLen.current = newLen;
  }, [moves.length, turn, timeControl]);

  // Tick active player's clock
  useEffect(() => {
    if (status !== 'playing' || winner || clockWhite === null) return;
    const interval = setInterval(() => {
      if (turn === 'white') {
        setClockWhite(prev => {
          if (prev === null) return null;
          const next = Math.max(0, prev - 100);
          if (next === 0 && !timedOutRef.current) {
            timedOutRef.current = true;
            // White ran out — black wins
            supabase.from('games').update({ status: 'finished', winner: 'black' }).eq('id', gameId!).then(() => {});
          }
          return next;
        });
      } else {
        setClockBlack(prev => {
          if (prev === null) return null;
          const next = Math.max(0, prev - 100);
          if (next === 0 && !timedOutRef.current) {
            timedOutRef.current = true;
            // Black ran out — white wins
            supabase.from('games').update({ status: 'finished', winner: 'white' }).eq('id', gameId!).then(() => {});
          }
          return next;
        });
      }
    }, 100);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, winner, turn, clockWhite !== null]);

  useEffect(() => {
    if (gameId && userId) loadGame(gameId, userId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, userId]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => { applyGameRow(payload.new as GameRow, userId); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, userId, applyGameRow]);

  const handleLeave = () => { reset(); navigate('/online'); };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, gap: 10, minHeight: '100%' }}>

        {/* Top bar */}
        <div style={{
          width: '100%', maxWidth: 640,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.surface, boxShadow: t.topBar, borderRadius: 10, padding: '8px 14px',
        }}>
          <button onClick={handleLeave}
            style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 13 }}>
            ← Меню
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: t.blue, fontWeight: 600 }}>👥 Онлайн</span>
            <span style={{ color: t.border2 }}>|</span>
            <span style={{ color: t.muted }}>{variantLabel(variant)} · Ходов: {moves.length}</span>
          </div>
          <div style={{ width: 60 }} />
        </div>

        <PlayerRow
          name={opponentName ?? '...'}
          color={oppColor}
          isActive={turn === oppColor && !winner}
          timeMs={oppColor === 'white' ? clockWhite : clockBlack}
          t={t}
        />

        <OnlineBoard />

        <PlayerRow
          name={username}
          color={myColorSafe}
          isActive={isMyTurn}
          timeMs={myColorSafe === 'white' ? clockWhite : clockBlack}
          t={t}
        />

        {!winner && (
          <div style={{ color: t.dim, fontSize: 12, textAlign: 'center' }}>
            {isMyTurn
              ? '🔴 Красная рамка — доступное взятие · Зелёная точка — обычный ход'
              : `⏳ Ход ${opponentName ?? '...'}...`}
          </div>
        )}

        {/* Winner banner */}
        {winner && (
          <div style={{
            background: winner === 'draw' ? t.surface : t.greenDark,
            boxShadow: t.card,
            borderRadius: 12, padding: '16px 28px', textAlign: 'center', maxWidth: 340, width: '100%',
          }}>
            <div style={{ color: winner === 'draw' ? t.text : t.green, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              {winner === 'draw' ? '🤝 Ничья!' : winner === myColorSafe ? '🏆 Вы победили!' : '😔 Вы проиграли'}
            </div>
            <div style={{ color: t.muted, fontSize: 13, marginBottom: 14 }}>
              Партия завершена · {moves.length} ходов
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={handleLeave}
                style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: t.green, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Ещё партию
              </button>
              <button onClick={() => navigate('/home')}
                style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${t.border2}`, background: 'transparent', color: t.text, fontSize: 14, cursor: 'pointer' }}>
                В меню
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
