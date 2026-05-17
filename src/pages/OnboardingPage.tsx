import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const LEVELS = [
  { id: 'beginner',      icon: '○',  label: 'Я не умею играть' },
  { id: 'casual',        icon: '◎',  label: 'Знаю правила и основы' },
  { id: 'intermediate',  icon: '◉',  label: 'Знаю стратегии и тактики' },
  { id: 'tournament',    icon: '⛀',  label: 'Играю на соревнованиях' },
] as const;

type Level = typeof LEVELS[number]['id'];

export function OnboardingPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [selected, setSelected] = useState<Level | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setLoading(true);

    await supabase.auth.updateUser({
      data: { onboarding_done: true, experience: selected },
    });

    navigate('/home', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#262522',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: '#1a1917',
        borderRadius: 14,
        padding: '40px 32px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 6 }}>⛀</div>
        <div style={{ color: '#81b64c', fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 28 }}>
          Shashki.com
        </div>

        <h1 style={{ color: '#e8e6e3', fontSize: 22, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 }}>
          Какой у вас опыт в шашках?
        </h1>
        <p style={{ color: '#999693', fontSize: 14, margin: '0 0 28px' }}>
          Это поможет нам подобрать подходящих соперников
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {LEVELS.map(level => (
            <button
              key={level.id}
              onClick={() => setSelected(level.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 10,
                border: `2px solid ${selected === level.id ? '#81b64c' : '#3d3a36'}`,
                background: selected === level.id ? '#1d3320' : '#262522',
                color: selected === level.id ? '#e8e6e3' : '#c4c0bb',
                fontSize: 15,
                fontWeight: selected === level.id ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: selected === level.id ? '#81b64c' : '#302e2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                color: selected === level.id ? '#fff' : '#999693',
                transition: 'all 0.15s',
              }}>
                {level.icon}
              </span>
              {level.label}
              {selected === level.id && (
                <span style={{ marginLeft: 'auto', color: '#81b64c', fontSize: 18 }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            border: 'none',
            background: selected ? '#81b64c' : '#3d3a36',
            color: selected ? '#fff' : '#666462',
            fontSize: 15,
            fontWeight: 700,
            cursor: selected && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Загрузка...' : 'Продолжить'}
        </button>
      </div>
    </div>
  );
}
