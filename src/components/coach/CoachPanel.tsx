import { useState, useRef, useEffect } from 'react';
import { useT } from '../../store/themeStore';

export interface CoachMessage {
  id: string;
  role: 'coach' | 'player';
  text: string;
  streaming?: boolean;
}

interface Props {
  messages: CoachMessage[];
  loading: boolean;
  onSend: (text: string) => void;
}

export function CoachPanel({ messages, loading, onSend }: Props) {
  const t = useT();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    onSend(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{
      width: 290, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: t.surface, boxShadow: t.card,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 20 }}>🎓</span>
        <span style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>Коуч</span>
        {loading && <span style={{ color: t.green, fontSize: 11, marginLeft: 'auto' }}>думает...</span>}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px',
        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{ color: t.dim, fontSize: 12, textAlign: 'center', padding: '20px 8px' }}>
            Делай ходы — Коуч анализирует
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: msg.role === 'player' ? 'row-reverse' : 'row',
            gap: 6, alignItems: 'flex-start',
          }}>
            {msg.role === 'coach' && (
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>🎓</span>
            )}
            <div style={{
              maxWidth: '85%', padding: '7px 11px',
              borderRadius: msg.role === 'player' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'player' ? t.greenDark : t.surface2,
              color: t.text, fontSize: 13, lineHeight: 1.5,
            }}>
              {msg.text}
              {msg.streaming && <span style={{ color: t.green }}>▌</span>}
            </div>
          </div>
        ))}

        {loading && (messages.length === 0 || messages.at(-1)?.role === 'player') && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>🎓</span>
            <div style={{
              padding: '7px 14px', background: t.surface2,
              borderRadius: '12px 12px 12px 4px',
              color: t.dim, fontSize: 13, letterSpacing: 3,
            }}>···</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div style={{
        padding: '8px 10px 4px', display: 'flex', gap: 6, flexWrap: 'wrap',
        borderTop: `1px solid ${t.border}`, flexShrink: 0,
      }}>
        {['Лучший ход?', 'Как я играю?', 'Объясни позицию'].map(q => (
          <button key={q} onClick={() => onSend(q)} disabled={loading} style={{
            padding: '4px 10px', borderRadius: 20,
            border: `1px solid ${t.border2}`,
            background: t.surface2, color: t.muted, fontSize: 11,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '8px 10px', display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Спроси коуча..."
          disabled={loading}
          style={{
            flex: 1, background: t.surface2,
            border: `1px solid ${t.border2}`,
            borderRadius: 8, padding: '7px 11px',
            color: t.text, fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            width: 34, height: 34, borderRadius: 8, border: 'none',
            background: input.trim() && !loading ? t.green : t.border2,
            color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: 16, flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
