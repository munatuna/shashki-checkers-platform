import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';
import { supabase } from '../lib/supabase';

interface PlayerRow {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

function winRate(p: PlayerRow): number {
  const total = p.wins + p.losses + p.draws;
  return total === 0 ? 0 : Math.round((p.wins / total) * 100);
}

function eloTier(elo: number): { label: string; color: string } {
  if (elo >= 2000) return { label: 'Мастер',        color: '#e8a020' };
  if (elo >= 1600) return { label: 'Эксперт',       color: '#9b7fd4' };
  if (elo >= 1400) return { label: 'Продвинутый',   color: '#5b8dd9' };
  if (elo >= 1200) return { label: 'Средний',        color: '#81b64c' };
  return                   { label: 'Начинающий',   color: '#999693' };
}

export function LeaderboardPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, elo, wins, losses, draws')
        .order('elo', { ascending: false })
        .limit(100);

      if (data) {
        setPlayers(data as PlayerRow[]);
        if (user) {
          const rank = (data as PlayerRow[]).findIndex(p => p.id === user.id);
          setMyRank(rank >= 0 ? rank + 1 : null);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const myPlayer = players.find(p => p.id === user?.id);

  return (
    <AppLayout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: t.text, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            🏆 Таблица лидеров
          </h1>
          <p style={{ color: t.dim, fontSize: 14, margin: '4px 0 0' }}>
            Топ игроков по рейтингу ELO
          </p>
        </div>

        {/* My rank card */}
        {myPlayer && myRank && (
          <div style={{
            background: t.greenDark, boxShadow: t.card,
            borderRadius: 12, padding: '16px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ color: t.green, fontSize: 28, fontWeight: 900, minWidth: 48, textAlign: 'center' }}>
              #{myRank}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.text, fontSize: 15, fontWeight: 700 }}>Ваша позиция</div>
              <div style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>
                {myPlayer.wins}П · {myPlayer.losses}П · {myPlayer.draws}Н · {winRate(myPlayer)}% побед
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: t.green, fontSize: 24, fontWeight: 900 }}>{myPlayer.elo}</div>
              <div style={{ color: t.dim, fontSize: 11 }}>{eloTier(myPlayer.elo).label}</div>
            </div>
            <button onClick={() => navigate('/profile')} style={{
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${t.green}44`,
              background: 'transparent', color: t.green, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Профиль
            </button>
          </div>
        )}

        {/* Table */}
        <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 12, overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '48px 1fr 100px 120px 80px',
            padding: '10px 20px', background: t.surface2,
            borderBottom: `1px solid ${t.border}`,
          }}>
            {['#', 'Игрок', 'ELO', 'Результаты', 'Побед'].map(h => (
              <div key={h} style={{ color: t.dim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: t.dim, fontSize: 14 }}>
              Загрузка...
            </div>
          ) : players.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⛀</div>
              <div style={{ color: t.muted, fontSize: 14 }}>Пока нет игроков</div>
              <div style={{ color: t.dim, fontSize: 12, marginTop: 4 }}>Сыграйте онлайн-партию, чтобы появиться здесь</div>
            </div>
          ) : (
            players.map((p, i) => {
              const isMe = p.id === user?.id;
              const tier = eloTier(p.elo);
              return (
                <div
                  key={p.id}
                  onClick={() => isMe && navigate('/profile')}
                  style={{
                    display: 'grid', gridTemplateColumns: '48px 1fr 100px 120px 80px',
                    padding: '12px 20px',
                    borderBottom: i < players.length - 1 ? `1px solid ${t.border}` : 'none',
                    alignItems: 'center',
                    background: isMe ? t.greenDark : 'transparent',
                    cursor: isMe ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = t.surface2; }}
                  onMouseLeave={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Rank */}
                  <div style={{
                    color: i === 0 ? '#e8a020' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : t.dim,
                    fontSize: i < 3 ? 16 : 14,
                    fontWeight: i < 3 ? 800 : 600,
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </div>

                  {/* Player */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isMe ? '#2d4a1e' : t.surface2,
                      border: `2px solid ${isMe ? t.green : t.border2}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: isMe ? t.green : t.muted,
                      flexShrink: 0,
                    }}>
                      {p.username[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div style={{ color: isMe ? t.text : t.textSub, fontSize: 14, fontWeight: isMe ? 700 : 600 }}>
                        {p.username} {isMe && <span style={{ color: t.green, fontSize: 11 }}>(вы)</span>}
                      </div>
                      <div style={{ color: tier.color, fontSize: 11, marginTop: 1 }}>{tier.label}</div>
                    </div>
                  </div>

                  {/* ELO */}
                  <div style={{ color: tier.color, fontSize: 16, fontWeight: 800 }}>{p.elo}</div>

                  {/* W/L/D */}
                  <div style={{ display: 'flex', gap: 6, fontSize: 13 }}>
                    <span style={{ color: t.green }}>{p.wins}П</span>
                    <span style={{ color: t.dim }}>·</span>
                    <span style={{ color: t.red }}>{p.losses}П</span>
                    <span style={{ color: t.dim }}>·</span>
                    <span style={{ color: t.muted }}>{p.draws}Н</span>
                  </div>

                  {/* Win rate */}
                  <div style={{ color: t.muted, fontSize: 13, fontWeight: 600 }}>
                    {winRate(p)}%
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
