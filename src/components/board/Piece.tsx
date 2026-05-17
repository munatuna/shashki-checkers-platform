import { motion } from 'framer-motion';
import type { Piece as PieceType } from '../../engine/types';

interface Props {
  piece: PieceType;
}

export function Piece({ piece }: Props) {
  const isWhite = piece.color === 'white';
  return (
    <motion.div
      layout
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        width: '82%',
        height: '82%',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isWhite
          ? '0 3px 8px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.6)'
          : '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)',
        background: isWhite
          ? 'radial-gradient(circle at 35% 35%, #f5f5f0, #c8c4be)'
          : 'radial-gradient(circle at 35% 35%, #4a4845, #1a1917)',
        border: isWhite ? '2px solid #a09c96' : '2px solid #0d0c0b',
        flexShrink: 0,
      }}
    >
      {piece.kind === 'king' && (
        <span style={{
          fontSize: '46%',
          color: isWhite ? '#b8860b' : '#d4a017',
          fontWeight: 900,
          lineHeight: 1,
          userSelect: 'none',
        }}>
          ♛
        </span>
      )}
    </motion.div>
  );
}
