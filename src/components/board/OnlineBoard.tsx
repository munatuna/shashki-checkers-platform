import { useOnlineStore } from '../../store/onlineStore';
import { Square } from './Square';
import { Piece } from './Piece';

export function OnlineBoard() {
  const { board, selected, legalMoves, selectSquare } = useOnlineStore();

  const isLegalTarget = (r: number, c: number) =>
    legalMoves.some(m => m.to.row === r && m.to.col === c);

  const isCaptureTarget = (r: number, c: number) =>
    legalMoves.some(m => m.to.row === r && m.to.col === c && m.captures.length > 0);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      width: 560, height: 560,
      borderRadius: 0, overflow: 'hidden',
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
