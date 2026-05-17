import { useNavigate } from 'react-router-dom';
import { Board } from '../components/board/Board';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';
import type { RuleVariant } from '../engine/types';
import { DIFFICULTY_LABEL } from '../store/gameStore';
import type { Difficulty } from '../store/gameStore';

function variantLabel(v: RuleVariant) {
  if (v === 'russian')       return 'Русские';
  if (v === 'international') return 'Международные';
  if (v === 'english')       return 'Английские';
  return v;
}

export function GamePage() {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();
  const { turn, winner, newGame, variant, mode, botColor, botThinking, history, difficulty } = useGameStore();

  const username = (user?.user_metadata?.username as string | undefined) ?? 'Вы';
  const isPlayerTurn = mode === 'local' || turn !== botColor;
  const opponentName = mode === 'bot' ? 'Бот' : 'Соперник';
  const playerColor  = mode === 'bot' ? (botColor === 'black' ? 'white' : 'black') : 'white';

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', gap: 10, minHeight: '100%' }}>

        {/* Top bar */}
        <div style={{
          width: '100%', maxWidth: 640,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.surface, boxShadow: t.topBar,
          borderRadius: 10, padding: '8px 14px', gap: 8,
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Меню
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: t.muted }}>{variantLabel(variant)}</span>
            <span style={{ color: t.border2 }}>|</span>
            <span style={{ color: t.green, fontWeight: 600 }}>
              {mode === 'bot' ? '🤖 Против бота' : '👥 Локальная игра'}
            </span>
            <span style={{ color: t.border2 }}>|</span>
            <span style={{ color: t.muted }}>Ходов: {history.length}</span>
          </div>
          <button
            onClick={() => newGame(variant, mode)}
            style={{ background: t.surface2, borderRadius: 6, border: 'none', color: t.muted, fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
          >
            Новая
          </button>
        </div>

        <PlayerRow name={opponentName} color={playerColor === 'white' ? 'black' : 'white'} isActive={!isPlayerTurn && !winner} thinking={botThinking} t={t} />

        <div style={{ position: 'relative' }}>
          <Board />
          {botThinking && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', borderRadius: 4, pointerEvents: 'none' }} />
          )}
        </div>

        <PlayerRow name={username} color={playerColor} isActive={isPlayerTurn && !winner} thinking={false} t={t} />

        {!winner && !botThinking && (
          <div style={{ color: t.dim, fontSize: 12, textAlign: 'center' }}>
            {isPlayerTurn
              ? '🔴 Красная рамка — доступное взятие · Зелёная точка — обычный ход'
              : '⏳ Бот думает...'}
          </div>
        )}

        {/* Winner banner */}
        {winner && (
          <div style={{
            background: winner === 'draw' ? t.surface : t.greenDark,
            boxShadow: t.card,
            borderRadius: 12, padding: '16px 28px',
            textAlign: 'center', maxWidth: 340, width: '100%',
          }}>
            <div style={{ color: winner === 'draw' ? t.text : t.green, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              {winner === 'draw' ? '🤝 Ничья!' : winner === playerColor ? '🏆 Вы победили!' : '😔 Вы проиграли'}
            </div>
            <div style={{ color: t.muted, fontSize: 13, marginBottom: 14 }}>
              Партия завершена · {history.length} ходов
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => newGame(variant, mode)}
                style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: t.green, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Реванш
              </button>
              <button
                onClick={() => navigate('/home')}
                style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${t.border2}`, background: 'transparent', color: t.text, fontSize: 14, cursor: 'pointer' }}
              >
                В меню
              </button>
            </div>
          </div>
        )}

        {/* Variant + difficulty switcher */}
        {!winner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['russian', 'international', 'english'] as RuleVariant[]).map(v => (
                <button key={v} onClick={() => newGame(v, mode, difficulty)} style={{
                  padding: '5px 12px', borderRadius: 6,
                  border: `1px solid ${variant === v ? t.green : t.border3}`,
                  background: variant === v ? t.greenDark : t.surface,
                  color: variant === v ? t.green : t.dim,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {variantLabel(v)}
                </button>
              ))}
            </div>
            {mode === 'bot' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => newGame(variant, mode, d)} style={{
                    padding: '4px 12px', borderRadius: 6,
                    border: `1px solid ${difficulty === d ? t.orange : t.border3}`,
                    background: difficulty === d ? t.orangeDark : t.surface,
                    color: difficulty === d ? t.orange : t.dim,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function PlayerRow({ name, color, isActive, thinking, t }: {
  name: string; color: 'white' | 'black'; isActive: boolean; thinking: boolean;
  t: ReturnType<typeof useT>;
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0, transition: 'border-color 0.2s',
      }}>
        {color === 'white' ? '○' : '●'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: isActive ? t.text : t.muted, fontSize: 14, fontWeight: 600 }}>{name}</div>
        <div style={{ color: t.dim, fontSize: 11 }}>{color === 'white' ? 'Белые' : 'Чёрные'}</div>
      </div>
      {isActive && (
        <div style={{ color: thinking ? t.orange : t.green, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, paddingRight: 8 }}>
          {thinking ? '⏳ Думает...' : '● Ваш ход'}
        </div>
      )}
    </div>
  );
}
