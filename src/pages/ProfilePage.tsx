import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useT } from '../store/themeStore';
import { AppLayout } from '../components/layout/AppLayout';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
}

interface GameRecord {
  id: string;
  variant: string;
  winner: string | null;
  white_name: string | null;
  black_name: string | null;
  player_white: string | null;
  player_black: string | null;
  moves: unknown[];
  created_at: string;
}

function variantLabel(v: string) {
  if (v === 'russian')       return 'Русские';
  if (v === 'international') return 'Международные';
  return 'Английские';
}

function eloTier(elo: number): { label: string; color: string } {
  if (elo >= 2000) return { label: 'Мастер',        color: '#e8a020' };
  if (elo >= 1600) return { label: 'Эксперт',       color: '#9b7fd4' };
  if (elo >= 1400) return { label: 'Продвинутый',   color: '#5b8dd9' };
  if (elo >= 1200) return { label: 'Средний',        color: '#81b64c' };
  return                   { label: 'Начинающий',   color: '#999693' };
}

function StatCard({ label, value, color, t }: { label: string; value: string | number; color: string; t: ReturnType<typeof useT> }) {
  return (
    <div style={{ background: t.surface2, boxShadow: t.card, borderRadius: 12, padding: '16px 20px', textAlign: 'center', flex: 1 }}>
      <div style={{ color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      <div style={{ color: t.dim, fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function ProfilePage() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);

  const userId = user?.id ?? '';
  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email ?? 'Игрок';

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (fetchErr) { setLoading(false); return; }

        let prof: Profile | null = existing as Profile | null;

        if (!prof) {
          await supabase.from('profiles').insert({ id: userId, username });
          const { data: created } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          prof = created as Profile | null;
        }

        setProfile(prof);

        if (prof) {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('elo', prof.elo);
          setRank((count ?? 0) + 1);
        }

        const { data: gameData } = await supabase
          .from('games')
          .select('id, variant, winner, white_name, black_name, player_white, player_black, moves, created_at')
          .or(`player_white.eq.${userId},player_black.eq.${userId}`)
          .eq('status', 'finished')
          .order('created_at', { ascending: false })
          .limit(10);

        setGames((gameData as GameRecord[]) ?? []);
      } catch {
        // table likely doesn't exist — profile will be null, shows setup message
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ color: t.dim, fontSize: 14 }}>Загрузка профиля...</div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, padding: 24 }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <div style={{ color: t.text, fontSize: 16, fontWeight: 700 }}>Профиль не создан</div>
          <div style={{ color: t.muted, fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
            Скорее всего SQL-схема ещё не запущена в Supabase. Запусти скрипт из чата и обнови страницу.
          </div>
          <button onClick={() => window.location.reload()} style={{
            padding: '9px 24px', borderRadius: 8, border: 'none',
            background: t.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Обновить
          </button>
        </div>
      </AppLayout>
    );
  }

  const tier = eloTier(profile.elo);
  const total = profile.wins + profile.losses + profile.draws;
  const wr = total === 0 ? 0 : Math.round((profile.wins / total) * 100);

  return (
    <AppLayout>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <button onClick={() => navigate('/leaderboard')} style={{
          background: 'none', border: 'none', color: t.muted, cursor: 'pointer',
          fontSize: 13, marginBottom: 20, padding: 0,
        }}>
          ← Таблица лидеров
        </button>

        {/* Profile card */}
        <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 16, padding: '28px 32px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: t.greenDark,
              border: `3px solid ${t.green}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, color: t.green, flexShrink: 0,
            }}>
              {profile.username[0]?.toUpperCase() ?? '?'}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ color: t.text, fontSize: 22, fontWeight: 800, margin: 0 }}>
                  {profile.username}
                </h1>
                <span style={{
                  background: `${tier.color}22`, color: tier.color,
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                }}>
                  {tier.label}
                </span>
              </div>
              <div style={{ color: t.dim, fontSize: 13, marginTop: 4 }}>
                Зарегистрирован: {new Date(profile.created_at).toLocaleDateString('ru-RU')}
                {rank && <span style={{ marginLeft: 12 }}>· Место в рейтинге: <span style={{ color: t.green, fontWeight: 700 }}>#{rank}</span></span>}
              </div>
            </div>

            {/* ELO */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: tier.color, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{profile.elo}</div>
              <div style={{ color: t.dim, fontSize: 12, marginTop: 2 }}>ELO рейтинг</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <StatCard label="Победы"    value={profile.wins}   color={t.green} t={t} />
          <StatCard label="Поражения" value={profile.losses} color={t.red}   t={t} />
          <StatCard label="Ничьи"     value={profile.draws}  color={t.muted} t={t} />
          <StatCard label="% побед"   value={`${wr}%`}       color={t.blue}  t={t} />
          <StatCard label="Партий"    value={total}          color={t.text}  t={t} />
        </div>

        {/* Recent games */}
        <div>
          <h2 style={{ color: t.text, fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>
            История онлайн-партий
          </h2>
          <div style={{ background: t.surface, boxShadow: t.card, borderRadius: 12, overflow: 'hidden' }}>
            {games.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⛀</div>
                <div style={{ color: t.muted, fontSize: 14 }}>Нет сыгранных онлайн-партий</div>
                <div style={{ color: t.dim, fontSize: 12, marginTop: 4 }}>
                  Сыграйте партию — она появится здесь
                </div>
                <button onClick={() => navigate('/online')} style={{
                  marginTop: 16, padding: '9px 24px', borderRadius: 8,
                  border: 'none', background: t.green, color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                  Играть онлайн
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 90px 60px 100px 80px',
                  padding: '8px 16px', background: t.surface2,
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  {['Соперник', 'Вариант', 'Результат', 'Ходов', 'Дата', ''].map(h => (
                    <div key={h} style={{ color: t.dim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </div>
                  ))}
                </div>
                {games.map((g, i) => {
                  const amWhite = g.player_white === userId;
                  const oppName = amWhite ? (g.black_name ?? '?') : (g.white_name ?? '?');
                  const myColor = amWhite ? 'white' : 'black';
                  const result = g.winner === null ? null
                    : g.winner === 'draw' ? 'draw'
                    : g.winner === myColor ? 'win' : 'loss';

                  return (
                    <div key={g.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 90px 60px 100px 80px',
                      padding: '10px 16px',
                      borderBottom: i < games.length - 1 ? `1px solid ${t.border}` : 'none',
                      alignItems: 'center',
                    }}>
                      <div style={{ color: t.text, fontSize: 13 }}>{oppName}</div>
                      <div style={{ color: t.dim, fontSize: 12 }}>{variantLabel(g.variant)}</div>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: result === 'win' ? t.green : result === 'loss' ? t.red : t.muted,
                      }}>
                        {result === 'win' ? '✓ Победа' : result === 'loss' ? '✗ Поражение' : result === 'draw' ? '= Ничья' : '—'}
                      </div>
                      <div style={{ color: t.muted, fontSize: 13 }}>{(g.moves as unknown[]).length}</div>
                      <div style={{ color: t.dim, fontSize: 12 }}>
                        {new Date(g.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      <button
                        onClick={() => navigate(`/replay/${g.id}`)}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: 'none',
                          background: t.surface2, color: t.blue,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        ▶ Разбор
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
