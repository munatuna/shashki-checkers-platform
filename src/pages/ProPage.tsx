import { useNavigate } from 'react-router-dom';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';

const FEATURES = [
  { icon: '📊', title: 'Детальная аналитика партий', desc: 'Граф ошибок, точность ходов, слабые места' },
  { icon: '🎯', title: 'Неограниченные тренировки с AI', desc: 'Без дневного лимита сессий с наставником' },
  { icon: '🎨', title: 'Эксклюзивные темы доски', desc: 'Дерево, мрамор, неон и другие скины' },
  { icon: '🏅', title: 'Значок PRO на профиле', desc: 'Золотая корона рядом с именем' },
  { icon: '📥', title: 'Экспорт партий в PDF/PGN', desc: 'Сохраняй историю и делись анализами' },
  { icon: '⚡', title: 'Приоритетный поиск соперника', desc: 'Быстрее попадаешь в матчи твоего уровня' },
];

const PLANS = [
  {
    id: 'month',
    label: 'Месяц',
    price: '299',
    period: '₸ / мес',
    sub: 'Отменить в любой момент',
    highlight: false,
  },
  {
    id: 'year',
    label: 'Год',
    price: '1990',
    period: '₸ / год',
    sub: 'Экономия 40% · ~166₸/мес',
    highlight: true,
    badge: 'Популярный',
  },
];

export function ProPage() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '36px 24px' }}>

        {/* Header */}
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: t.muted, cursor: 'pointer',
          fontSize: 13, marginBottom: 20, padding: 0,
        }}>
          ← Назад
        </button>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>👑</div>
          <h1 style={{
            color: t.text, fontSize: 30, fontWeight: 900, margin: '0 0 8px',
            background: 'linear-gradient(135deg, #b8860b, #f5c842)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Shashki Pro
          </h1>
          <p style={{ color: t.dim, fontSize: 15, margin: 0 }}>
            Раскрой полный потенциал своей игры
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 36 }}>
          {FEATURES.map(f => (
            <div key={f.icon} style={{
              background: t.surface, boxShadow: t.card, borderRadius: 12,
              padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ color: t.text, fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{f.title}</div>
                <div style={{ color: t.dim, fontSize: 12 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              flex: 1, background: t.surface, boxShadow: t.card,
              borderRadius: 16, padding: '24px 20px', textAlign: 'center',
              position: 'relative',
              boxShadow: plan.highlight ? `0 0 0 2px #e8a020, 0 4px 16px rgba(0,0,0,0.15)` : undefined,
            }}>
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #b8860b, #e8a020)',
                  color: '#1a1200', fontSize: 11, fontWeight: 800,
                  padding: '3px 14px', borderRadius: 20,
                }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ color: t.textSub, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{plan.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ color: t.text, fontSize: 36, fontWeight: 900 }}>{plan.price}</span>
                <span style={{ color: t.muted, fontSize: 14 }}>{plan.period}</span>
              </div>
              <div style={{ color: t.dim, fontSize: 12, marginBottom: 20 }}>{plan.sub}</div>
              <button style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                background: plan.highlight
                  ? 'linear-gradient(135deg, #b8860b, #e8a020)'
                  : t.surface2,
                color: plan.highlight ? '#1a1200' : t.text,
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                boxShadow: plan.highlight ? '0 4px 16px rgba(232,160,32,0.4)' : 'none',
              }}>
                {plan.highlight ? '👑 Оформить подписку' : 'Выбрать'}
              </button>
            </div>
          ))}
        </div>

        <p style={{ color: t.dim, fontSize: 12, textAlign: 'center', margin: 0 }}>
          Безопасная оплата через Stripe · Отмена в любое время · Поддержка 24/7
        </p>
      </div>
    </AppLayout>
  );
}
