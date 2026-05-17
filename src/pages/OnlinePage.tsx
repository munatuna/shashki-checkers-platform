import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOnlineStore } from '../store/onlineStore';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';
import type { RuleVariant } from '../engine/types';
import type { GameRow } from '../store/onlineStore';
import { supabase } from '../lib/supabase';

const VARIANTS: { id: RuleVariant; label: string; desc: string }[] = [
  { id: 'russian',       label: 'Русские',        desc: '8×8 · бьёт назад' },
  { id: 'international', label: 'Международные',   desc: '10×10 · международные правила' },
  { id: 'english',       label: 'Английские',      desc: '8×8 · только вперёд' },
];

const TIME_CONTROLS = [
  { id: '3+2',       label: '3+2',  desc: '3 мин + 2 сек' },
  { id: '5+0',       label: '5+0',  desc: '5 минут' },
  { id: '10+0',      label: '10+0', desc: '10 минут' },
  { id: 'unlimited', label: '∞',    desc: 'Без лимита' },
];

type Tab = 'match' | 'room';

function BoardPreview({ variant }: { variant: RuleVariant }) {
  const size = variant === 'international' ? 10 : 8;
  const squares = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isDark = (r + c) % 2 === 1;
      const hasWhite = isDark && r >= size - 3;
      const hasBlack = isDark && r <= 2;
      squares.push(
        <div key={`${r}-${c}`} style={{
          background: isDark ? '#739552' : '#ebecd0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {hasWhite && (
            <div style={{
              width: '72%', height: '72%', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #ffffff, #c8c4be)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.45)',
            }} />
          )}
          {hasBlack && (
            <div style={{
              width: '72%', height: '72%', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #5a5653, #1a1917)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
            }} />
          )}
        </div>
      );
    }
  }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`,
      width: '100%', aspectRatio: '1',
      borderRadius: 0, overflow: 'hidden',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    }}>
      {squares}
    </div>
  );
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#81b64c',
          animation: `pulse 1.3s ease-in-out ${i * 0.22}s infinite`, opacity: 0.85,
        }} />
      ))}
    </div>
  );
}

export function OnlinePage() {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();
  const {
    status, roomCode, gameId, error,
    findMatch, cancelSearch, createRoom, joinRoom, applyGameRow, reset,
  } = useOnlineStore();

  const [tab, setTab] = useState<Tab>('match');
  const [variant, setVariant] = useState<RuleVariant>('russian');
  const [timeControl, setTimeControl] = useState('5+0');
  const [roomInput, setRoomInput] = useState('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? '';
  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email ?? 'Игрок';

  // Navigate only when game is actually playing
  useEffect(() => {
    if (status === 'playing' && gameId) navigate(`/online/${gameId}`);
  }, [status, gameId, navigate]);

  // Poll when searching for quick match
  useEffect(() => {
    if (status !== 'searching') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('games').select('id, status')
        .or(`player_white.eq.${userId},player_black.eq.${userId}`)
        .eq('status', 'active')
        .gt('created_at', new Date(Date.now() - 300_000).toISOString())
        .limit(1).single();
      if (data) { clearInterval(pollRef.current!); pollRef.current = null; navigate(`/online/${data.id}`); }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, userId, navigate]);

  // Realtime subscription while waiting in room
  useEffect(() => {
    if (status !== 'waiting_room' || !gameId) return;
    const channel = supabase
      .channel(`online-wait-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => { applyGameRow(payload.new as GameRow, userId); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [status, gameId, userId, applyGameRow]);

  useEffect(() => { reset(); }, [reset]);

  const handleFindMatch = () => findMatch(variant, userId, username, timeControl);
  const handleCancel = () => cancelSearch(userId);
  const handleCreateRoom = () => createRoom(variant, userId, username, timeControl);
  const handleJoinRoom = async () => {
    if (!roomInput.trim()) return;
    await joinRoom(roomInput.trim(), userId, username);
  };
  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flex: 1, minHeight: '100%' }}>

        {/* Left 50%: board preview */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px 48px',
          background: t.surface2, borderRight: `1px solid ${t.border}`,
        }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <BoardPreview variant={variant} />
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>
              {VARIANTS.find(v => v.id === variant)?.label}
            </div>
            <div style={{ color: t.dim, fontSize: 12, marginTop: 3 }}>
              {VARIANTS.find(v => v.id === variant)?.desc}
            </div>
          </div>
        </div>

        {/* Right 50%: controls */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '40px 48px' }}>
          <h1 style={{ color: t.text, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Играть онлайн
          </h1>
          <p style={{ color: t.dim, fontSize: 14, marginBottom: 32 }}>
            Играй с реальными соперниками в реальном времени
          </p>

          {/* Variant selector */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: t.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Вид шашек
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {VARIANTS.map(v => (
                <button key={v.id} onClick={() => setVariant(v.id)} style={{
                  padding: '12px 16px', borderRadius: 10,
                  border: `2px solid ${variant === v.id ? t.green : 'transparent'}`,
                  background: variant === v.id ? t.greenDark : t.surface2,
                  boxShadow: variant === v.id ? 'none' : t.card,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${variant === v.id ? t.green : t.border3}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {variant === v.id && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.green }} />
                    )}
                  </div>
                  <div>
                    <div style={{ color: variant === v.id ? t.text : t.textSub, fontSize: 14, fontWeight: 600 }}>
                      {v.label}
                    </div>
                    <div style={{ color: t.dim, fontSize: 12, marginTop: 1 }}>{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time control */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: t.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Контроль времени
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {TIME_CONTROLS.map(tc => (
                <button key={tc.id} onClick={() => setTimeControl(tc.id)} style={{
                  padding: '10px 6px', borderRadius: 8, border: 'none',
                  background: timeControl === tc.id ? t.greenMid : t.surface2,
                  boxShadow: timeControl === tc.id ? `inset 0 0 0 2px ${t.green}` : t.card,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                  <div style={{ color: timeControl === tc.id ? t.green : t.text, fontSize: 15, fontWeight: 800 }}>
                    {tc.label}
                  </div>
                  <div style={{ color: t.dim, fontSize: 10, marginTop: 2 }}>{tc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: t.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Способ игры
            </div>
            <div style={{ display: 'flex', gap: 2, background: t.surface2, borderRadius: 10, padding: 4, boxShadow: t.card }}>
              {([
                { id: 'match' as Tab, icon: '⚡', label: 'Быстрый матч', sub: 'Авто-поиск' },
                { id: 'room'  as Tab, icon: '🔗', label: 'Комната',      sub: 'По коду' },
              ]).map(tt => (
                <button key={tt.id} onClick={() => setTab(tt.id)} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 7, border: 'none',
                  background: tab === tt.id ? t.surface : 'transparent',
                  boxShadow: tab === tt.id ? t.card : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}>
                  <div style={{ color: tab === tt.id ? t.text : t.dim, fontSize: 13, fontWeight: 700 }}>
                    {tt.icon} {tt.label}
                  </div>
                  <div style={{ color: tab === tt.id ? t.muted : t.border3, fontSize: 11, marginTop: 2 }}>
                    {tt.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick match tab */}
          {tab === 'match' && (
            status === 'searching' ? (
              <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Dots /></div>
                <div style={{ color: t.text, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  Ищем соперника...
                </div>
                <div style={{ color: t.dim, fontSize: 13, marginBottom: 28 }}>
                  Подбираем игрока вашего уровня
                </div>
                <button onClick={handleCancel} style={{
                  padding: '10px 28px', borderRadius: 8,
                  border: `1px solid ${t.border2}`, background: 'transparent',
                  color: t.muted, fontSize: 14, cursor: 'pointer',
                }}>
                  Отменить
                </button>
              </div>
            ) : (
              <button onClick={handleFindMatch} style={{
                width: '100%', padding: 18, borderRadius: 12,
                border: 'none', background: t.green, color: '#fff',
                fontSize: 17, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.2px',
                boxShadow: `0 4px 18px ${t.green}55`,
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${t.green}77`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 18px ${t.green}55`;
              }}>
                ⚡ Найти соперника
              </button>
            )
          )}

          {/* Room tab */}
          {tab === 'room' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Create room */}
              <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 12, padding: 22 }}>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  Создать комнату
                </div>
                <div style={{ color: t.dim, fontSize: 12, marginBottom: 16 }}>
                  Получи код и пригласи друга
                </div>

                {status === 'waiting_room' && roomCode ? (
                  <div>
                    <div style={{
                      background: t.greenDark, boxShadow: t.card,
                      borderRadius: 10, padding: '20px 24px', marginBottom: 14, textAlign: 'center',
                    }}>
                      <div style={{ color: t.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                        Код комнаты
                      </div>
                      <div style={{
                        color: t.green, fontSize: 40, fontWeight: 900,
                        letterSpacing: 10, fontFamily: 'monospace', marginBottom: 14,
                      }}>
                        {roomCode}
                      </div>
                      <button onClick={handleCopy} style={{
                        padding: '9px 24px', borderRadius: 8,
                        border: `2px solid ${copied ? t.green : t.greenAlpha}`,
                        background: copied ? t.green : 'transparent',
                        color: copied ? '#fff' : t.green,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s',
                      }}>
                        {copied ? '✓ Скопировано' : 'Копировать код'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.dim, fontSize: 13, marginBottom: 10 }}>
                      <Dots /><span>Ожидаем соперника...</span>
                    </div>
                    <button onClick={() => reset()} style={{
                      padding: '8px 20px', borderRadius: 8,
                      border: `1px solid ${t.border2}`, background: 'transparent',
                      color: t.dim, fontSize: 13, cursor: 'pointer',
                    }}>
                      Отменить
                    </button>
                  </div>
                ) : (
                  <button onClick={handleCreateRoom} style={{
                    width: '100%', padding: 12, borderRadius: 8,
                    border: 'none', background: t.blue,
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>
                    🔗 Создать комнату
                  </button>
                )}
              </div>

              {/* Join room */}
              <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 12, padding: 22 }}>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  Войти по коду
                </div>
                <div style={{ color: t.dim, fontSize: 12, marginBottom: 16 }}>
                  Введи код, который прислал друг
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    maxLength={6}
                    style={{
                      flex: 1, background: t.surface2,
                      border: `2px solid ${t.border2}`,
                      borderRadius: 8, padding: '11px 14px',
                      color: t.text, fontSize: 20, fontWeight: 800,
                      letterSpacing: 8, outline: 'none', textAlign: 'center',
                    }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = t.greenAlpha; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border2; }}
                  />
                  <button onClick={handleJoinRoom} disabled={roomInput.length < 4} style={{
                    padding: '11px 22px', borderRadius: 8, border: 'none',
                    background: roomInput.length >= 4 ? t.green : t.border2,
                    color: roomInput.length >= 4 ? '#fff' : t.dim,
                    fontSize: 14, fontWeight: 700,
                    cursor: roomInput.length >= 4 ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                  }}>
                    Войти
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, color: t.red, fontSize: 13 }}>{error}</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
