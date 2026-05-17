import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useT } from '../../store/themeStore';

export function AppLayout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: t.bg }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
