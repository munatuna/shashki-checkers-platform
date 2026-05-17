import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Tab = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user, error, clearError } = useAuthStore();

  const [tab, setTab]           = useState<Tab>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (user) {
      const done = user.user_metadata?.onboarding_done as boolean | undefined;
      navigate(done ? '/home' : '/onboarding', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => { clearError(); setEmailSent(false); setStatus(''); }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(tab === 'register' ? 'Создаём аккаунт...' : 'Входим...');
    try {
      if (tab === 'register') {
        const result = await signUp(email, password, username);
        if (result === 'confirm_email') {
          setEmailSent(true);
        } else if (result === 'ok') {
          setStatus('Готово! Перенаправляем...');
          navigate('/onboarding', { replace: true });
        } else {
          setStatus('');
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setStatus('Ошибка соединения. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  // Экран "Проверьте почту"
  if (emailSent) {
    return (
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📬</div>
          <h2 style={{ color: '#e8e6e3', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
            Проверьте почту
          </h2>
          <p style={{ color: '#999693', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
            Мы отправили письмо на<br />
            <span style={{ color: '#e8e6e3', fontWeight: 600 }}>{email}</span>
          </p>
          <p style={{ color: '#999693', fontSize: 14, lineHeight: 1.5, margin: '0 0 28px' }}>
            Нажмите на ссылку в письме, чтобы подтвердить аккаунт. Если письмо не пришло — проверьте папку «Спам».
          </p>
          <div style={{
            background: '#302e2b',
            border: '1px solid #4a4845',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#999693',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            💡 После нажатия на ссылку откроется новое окно — его и нужно использовать. Старую вкладку можно закрыть.
          </div>
          <button
            onClick={() => { setEmailSent(false); setTab('login'); }}
            style={{ ...btnGhost, marginTop: 20, width: '100%' }}
          >
            Войти в аккаунт
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>⛀</div>
          <div style={{ color: '#81b64c', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 6 }}>
            Shashki.com
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: '#302e2b',
          borderRadius: 10,
          padding: 4,
          marginBottom: 22,
          gap: 4,
        }}>
          {(['register', 'login'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.15s',
                background: tab === t ? '#81b64c' : 'transparent',
                color: tab === t ? '#fff' : '#999693',
              }}
            >
              {t === 'register' ? 'Регистрация' : 'Войти'}
            </button>
          ))}
        </div>

        {/* Heading */}
        <h1 style={{ color: '#e8e6e3', fontSize: 20, fontWeight: 700, margin: '0 0 18px', textAlign: 'center' }}>
          {tab === 'register' ? 'Создайте аккаунт' : 'Добро пожаловать!'}
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

          {tab === 'register' && (
            <Field label="Имя пользователя">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="например, GrandMaster42"
                required minLength={3} maxLength={20}
                autoComplete="username"
                style={inputStyle}
              />
            </Field>
          )}

          <Field label="Электронная почта">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@mail.ru"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </Field>

          <Field label="Пароль">
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Минимум 8 символов' : '••••••••'}
                required
                minLength={tab === 'register' ? 8 : 1}
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999693', fontSize: 16, padding: 0 }}
                aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </Field>

          {error && (
            <div style={{ background: '#3d1f1f', border: '1px solid #6b2a2a', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
              {translateError(error)}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              padding: '13px',
              borderRadius: 8,
              border: 'none',
              background: submitting ? '#5a7d35' : '#81b64c',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%',
            }}
          >
            {submitting ? (
              <>
                <span style={{
                  display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                }} />
                {status || (tab === 'register' ? 'Создаём аккаунт...' : 'Входим...')}
              </>
            ) : (
              tab === 'register' ? 'Зарегистрироваться' : 'Войти'
            )}
          </button>

          {status && !submitting && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, textAlign: 'center',
              background: status.includes('Ошибка') ? '#3d1f1f' : '#1d3320',
              color: status.includes('Ошибка') ? '#f87171' : '#81b64c',
              fontSize: 13, fontWeight: 600,
            }}>
              {status}
            </div>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, color: '#999693', fontSize: 14 }}>
          {tab === 'register' ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
          <button
            onClick={() => setTab(tab === 'register' ? 'login' : 'register')}
            style={{ background: 'none', border: 'none', color: '#81b64c', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0, textDecoration: 'underline' }}
          >
            {tab === 'register' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </p>

        {tab === 'login' && (
          <p style={{ textAlign: 'center', margin: '4px 0 0' }}>
            <button style={{ background: 'none', border: 'none', color: '#999693', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>
              Забыли пароль?
            </button>
          </p>
        )}

        {tab === 'register' && (
          <p style={{ textAlign: 'center', marginTop: 14, color: '#666462', fontSize: 12, lineHeight: 1.5 }}>
            Регистрируясь, вы соглашаетесь с нашими{' '}
            <span style={{ color: '#81b64c', cursor: 'pointer' }}>Условиями</span>
            {' '}и{' '}
            <span style={{ color: '#81b64c', cursor: 'pointer' }}>Политикой конфиденциальности</span>
          </p>
        )}
      </div>

      <style>{`
        input::placeholder { color: #55524f; }
        input:focus { outline: none; border-color: #81b64c !important; box-shadow: 0 0 0 3px rgba(129,182,76,0.15); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: '#999693', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const wrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#262522',
  padding: '24px 16px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  background: '#1a1917',
  borderRadius: 14,
  padding: '36px 32px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: '#262522',
  border: '1.5px solid #4a4845',
  borderRadius: 8,
  color: '#e8e6e3',
  fontSize: 15,
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const btnGhost: React.CSSProperties = {
  padding: '11px 20px',
  borderRadius: 8,
  border: '1.5px solid #4a4845',
  background: 'transparent',
  color: '#e8e6e3',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (msg.includes('Email not confirmed'))        return 'Подтвердите email (проверьте почту)';
  if (msg.includes('User already registered'))    return 'Этот email уже зарегистрирован';
  if (msg.includes('Password should be'))         return 'Пароль должен быть не менее 8 символов';
  if (msg.includes('Unable to validate'))         return 'Проверьте данные и попробуйте снова';
  return msg;
}
