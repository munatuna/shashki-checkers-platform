import type { ReactNode } from 'react';

interface Props {
  isDark: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isCaptureTarget: boolean;
  onClick: () => void;
  children?: ReactNode;
}

export function Square({
  isDark, isSelected, isLegalMove, isCaptureTarget, onClick, children,
}: Props) {
  const bg = isDark ? '#b58863' : '#f0d9b5';
  const selectedOverlay = isSelected ? 'inset 0 0 0 4px rgba(255, 200, 0, 0.85)' : undefined;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: selectedOverlay,
      }}
    >
      {children}

      {/* Quiet move dot */}
      {isLegalMove && !isCaptureTarget && !children && (
        <div style={{
          position: 'absolute',
          width: '33%',
          height: '33%',
          borderRadius: '50%',
          background: 'rgba(99, 200, 99, 0.65)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Quiet move dot on occupied square (show smaller ring) */}
      {isLegalMove && !isCaptureTarget && children && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 0,
          boxShadow: 'inset 0 0 0 3px rgba(99, 200, 99, 0.7)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Capture target ring */}
      {isCaptureTarget && (
        <div style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 0 4px rgba(220, 60, 60, 0.9)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
