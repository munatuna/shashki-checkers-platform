import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const NAV = [
  { icon: '⚡', label: 'Играть онлайн', to: '/online', sub: 'Найти соперника' },
  { icon: '🤖', label: 'С ботом',       to: '/play',   sub: 'Тренировка' },
  { icon: '🎓', label: 'С наставником', to: '/coach',  sub: 'Обучение' },
];

// Sidebar is always dark — like Chess.com
const S = {
  bg:       '#1a1917',
  border:   '#2d2b27',
  activeBg: '#1d3320',
  activeFg: '#e8e6e3',
  itemHover:'#242220',
  iconBg:   '#262522',
  iconActive:'#2a4a2e',
  text:     '#c4c0bb',
  sub:      '#666462',
  green:    '#81b64c',
  muted:    '#999693',
};

export function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, signOut } = useAuthStore();
  const { isDark, toggle } = useThemeStore();

  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email ?? 'Игрок';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <aside style={{
      width: 220, minWidth: 220, minHeight: '100vh',
      background: S.bg,
      display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${S.border}`,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/home')}
        style={{
          padding: '18px 20px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          borderBottom: `1px solid ${S.border}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 28 }}>⛀</span>
        <span style={{ color: S.green, fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>
          Shashki.com
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', border: 'none', borderRadius: 0,
                background: active ? S.activeBg : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                borderLeft: `3px solid ${active ? S.green : 'transparent'}`,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = S.itemHover; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 8,
                background: active ? S.iconActive : S.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <div>
                <div style={{ color: active ? S.activeFg : S.text, fontSize: 14, fontWeight: 600 }}>
                  {item.label}
                </div>
                <div style={{ color: S.sub, fontSize: 11, marginTop: 1 }}>
                  {item.sub}
                </div>
              </div>
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: S.border, margin: '10px 16px' }} />

        <button
          onClick={() => navigate('/leaderboard')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', border: 'none',
            background: location.pathname === '/leaderboard' ? S.activeBg : 'transparent',
            cursor: 'pointer', textAlign: 'left',
            borderLeft: `3px solid ${location.pathname === '/leaderboard' ? S.green : 'transparent'}`,
          }}
          onMouseEnter={e => { if (location.pathname !== '/leaderboard') (e.currentTarget as HTMLElement).style.background = S.itemHover; }}
          onMouseLeave={e => { if (location.pathname !== '/leaderboard') (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ width: 36, height: 36, borderRadius: 8, background: location.pathname === '/leaderboard' ? S.iconActive : S.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            🏆
          </span>
          <div>
            <div style={{ color: location.pathname === '/leaderboard' ? S.activeFg : S.text, fontSize: 14, fontWeight: 600 }}>Рейтинг</div>
            <div style={{ color: S.sub, fontSize: 11, marginTop: 1 }}>Таблица лидеров</div>
          </div>
        </button>
      </nav>

      {/* Upgrade to Pro */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${S.border}` }}>
        <button
          onClick={() => navigate('/pro')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #b8860b 0%, #e8a020 50%, #f5c842 100%)',
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <span style={{ fontSize: 18 }}>👑</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#1a1200', fontSize: 13, fontWeight: 800 }}>Upgrade to Pro</div>
            <div style={{ color: '#3d2e00', fontSize: 10 }}>Разблокируй все функции</div>
          </div>
        </button>
      </div>

      {/* Theme toggle */}
      <div style={{ padding: '8px 16px', borderTop: `1px solid ${S.border}` }}>
        <button
          onClick={toggle}
          title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = S.itemHover; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
            {isDark ? '☀️' : '🌙'}
          </span>
          <span style={{ color: S.sub, fontSize: 13 }}>
            {isDark ? 'Светлая тема' : 'Тёмная тема'}
          </span>
        </button>
      </div>

      {/* User profile */}
      <div
        onClick={() => navigate('/profile')}
        style={{
          borderTop: `1px solid ${S.border}`,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = S.itemHover; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#2d4a1e', border: `2px solid ${S.green}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0, color: S.green, fontWeight: 700,
        }}>
          {username[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: S.activeFg, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </div>
          <div style={{ color: S.muted, fontSize: 11 }}>Онлайн</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); handleSignOut(); }}
          title="Выйти"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: S.sub, fontSize: 16, padding: 4, flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e04e4e'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = S.sub; }}
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
