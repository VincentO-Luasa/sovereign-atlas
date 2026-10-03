import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

const Ctx = createContext<{ show: (e: { clientX: number; clientY: number }, content: ReactNode) => void; hide: () => void }>({
  show: () => {},
  hide: () => {},
});

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = useCallback((e: { clientX: number; clientY: number }, content: ReactNode) => setTip({ x: e.clientX, y: e.clientY, content }), []);
  const hide = useCallback(() => setTip(null), []);
  const flip = tip && tip.x > window.innerWidth - 300;
  return (
    <Ctx.Provider value={{ show, hide }}>
      {children}
      {tip && (
        <div
          className="tooltip"
          style={{
            left: flip ? undefined : tip.x + 14,
            right: flip ? window.innerWidth - tip.x + 14 : undefined,
            top: Math.min(tip.y + 14, window.innerHeight - 140),
          }}
        >
          {tip.content}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useTooltip = () => useContext(Ctx);

export function TipRows({ title, rows }: { title?: ReactNode; rows: [ReactNode, ReactNode][] }) {
  return (
    <>
      {title && <div className="tt-title">{title}</div>}
      {rows.map(([k, v], i) => (
        <div className="tt-row" key={i}>
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </>
  );
}
