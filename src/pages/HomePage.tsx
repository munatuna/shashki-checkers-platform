import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore, loadGameHistory } from '../store/gameStore';
import { useT } from '../store/themeStore';
import type { GameRecord } from '../store/gameStore';
import type { RuleVariant } from '../engine/types';
import { AppLayout } from '../components/layout/AppLayout';

const VARIANTS: { id: RuleVariant; label: string; desc: string }[] = [
  { id: 'russian',       label: 'Русские',       desc: 'Летающая дамка · Бьёт назад · Обязательно для бота' },
  { id: 'international', label: 'Международные', desc: 'Максимум взятий · Летающая дамка' },
  { id: 'english',       label: 'Английские',    desc: 'Только вперёд · Дамка на 1 клетку' },
];

const PLAY_MODES = [
  { icon: '⚡', label: 'Быстрая игра',  sub: '5 минут',   color: '#e8a020', mode: 'local'  },
  { icon: '🆕', label: 'Новая партия',  sub: 'Локально',  color: '#81b64c', mode: 'local'  },
  { icon: '🤖', label: 'С ботом',       sub: 'Против ИИ', color: '#5b8dd9', mode: 'bot'    },
];

export function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const { user }  = useAuthStore();
  const { newGame } = useGameStore();
  const [selectedVariant, setSelectedVariant] = useState<RuleVariant>('russian');

  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email ?? 'Игрок';
  const history: GameRecord[] = loadGameHistory();

  const wins   = history.filter(g => g.result === 'win').length;
  const losses = history.filter(g => g.result === 'loss').length;
  const draws  = history.filter(g => g.result === 'draw').length;

  const handlePlay = (mode: string) => {
    if (mode === 'soon') return;
    newGame(selectedVariant, mode === 'bot' ? 'bot' : 'local');
    navigate('/play');
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>

        {/* Greeting + stats */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ color: t.text, fontSize: 24, fontWeight: 700, margin: 0 }}>
              Привет, {username}! 👋
            </h1>
            <p style={{ color: t.muted, fontSize: 14, margin: '4px 0 0' }}>Готов сыграть сегодня?</p>
          </div>
          {history.length > 0 && (
            <div style={{ display: 'flex', gap: 12 }}>
              <StatChip label="Победы"    value={wins}   color="#81b64c" t={t} />
              <StatChip label="Поражения" value={losses} color={t.red}   t={t} />
              <StatChip label="Ничьи"     value={draws}  color={t.muted} t={t} />
            </div>
          )}
        </div>

        {/* Variant selector */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: t.dim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Вид шашек
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VARIANTS.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: `2px solid ${selectedVariant === v.id ? t.green : t.border2}`,
                  background: selectedVariant === v.id ? t.greenDark : t.surface,
                  color: selectedVariant === v.id ? t.green : t.muted,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ color: t.dim, fontSize: 12, marginTop: 6 }}>
            {VARIANTS.find(v => v.id === selectedVariant)?.desc}
          </div>
        </div>

        {/* Play mode cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
          gap: 10, marginBottom: 36,
        }}>
          {PLAY_MODES.map(m => {
            const disabled = m.mode === 'soon';
            return (
              <button
                key={m.mode + m.label}
                onClick={() => handlePlay(m.mode)}
                disabled={disabled}
                style={{
                  background: t.surface,
                  boxShadow: t.card,
                  borderRadius: 12, padding: '18px 16px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: disabled ? 0.5 : 1,
                  border: 'none',
                }}
                onMouseEnter={e => {
                  if (disabled) return;
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 10,
                  background: `${m.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {m.icon}
                </div>
                <div>
                  <div style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{m.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Game History */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
              История игр
            </h2>
            <span style={{ color: t.dim, fontSize: 12 }}>{history.length} партий</span>
          </div>

          <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 12, overflow: 'hidden' }}>
            {history.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⛀</div>
                <div style={{ color: t.muted, fontSize: 14, fontWeight: 600 }}>Нет сыгранных партий</div>
                <div style={{ color: t.dim, fontSize: 12, marginTop: 4 }}>
                  Сыграйте первую партию — она появится здесь
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px 90px 100px',
                  padding: '8px 16px',
                  background: t.surface2,
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  {['Соперник', 'Режим', 'Результат', 'Ходов', 'Дата'].map(h => (
                    <div key={h} style={{ color: t.dim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </div>
                  ))}
                </div>
                {history.slice(0, 20).map((g, i) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px 90px 100px',
                      padding: '10px 16px',
                      borderBottom: i < Math.min(history.length, 20) - 1 ? `1px solid ${t.border}` : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ color: t.text, fontSize: 13 }}>{g.opponent}</div>
                    <div style={{ color: t.dim, fontSize: 12 }}>
                      {g.mode === 'bot' ? '🤖 Бот' : '👥 Локально'}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: g.result === 'win' ? t.green : g.result === 'loss' ? t.red : t.muted,
                    }}>
                      {g.result === 'win' ? '✓ Победа' : g.result === 'loss' ? '✗ Пораж.' : '= Ничья'}
                    </div>
                    <div style={{ color: t.muted, fontSize: 13 }}>{g.moves}</div>
                    <div style={{ color: t.dim, fontSize: 12 }}>{g.date}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatChip({ label, value, color, t }: { label: string; value: number; color: string; t: ReturnType<typeof useT> }) {
  return (
    <div style={{
      background: t.surface, boxShadow: t.card,
      borderRadius: 8, padding: '8px 14px', textAlign: 'center',
    }}>
      <div style={{ color, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: t.dim, fontSize: 11, marginTop: 3 }}>{label}</div>
    </div>
  );
}
