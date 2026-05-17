import { useGameStore } from '../../store/gameStore';
import { Square } from './Square';
import { Piece } from './Piece';

const BOARD_PX = 560;

export function Board() {
  const { board, selected, legalMoves, selectSquare } = useGameStore();

  const isLegalTarget = (row: number, col: number) =>
    legalMoves.some(m => m.to.row === row && m.to.col === col);

  const isCaptureTarget = (row: number, col: number) =>
    legalMoves.some(
      m => m.to.row === row && m.to.col === col && m.captures.length > 0
    );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      width: BOARD_PX,
      height: BOARD_PX,
      borderRadius: 0,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    }}>
      {board.map((row, rIdx) =>
        row.map((piece, cIdx) => {
          const isDark = (rIdx + cIdx) % 2 === 1;
          const isSelected = selected?.row === rIdx && selected?.col === cIdx;

          return (
            <Square
              key={`${rIdx}-${cIdx}`}
              isDark={isDark}
              isSelected={isSelected}
              isLegalMove={isLegalTarget(rIdx, cIdx)}
              isCaptureTarget={isCaptureTarget(rIdx, cIdx)}
              onClick={() => selectSquare({ row: rIdx, col: cIdx })}
            >
              {piece && <Piece piece={piece} />}
            </Square>
          );
        })
      )}
    </div>
  );
}
