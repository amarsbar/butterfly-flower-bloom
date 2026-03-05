import { useState, useEffect, useRef, useCallback } from "react";
import getCaretCoordinates from "textarea-caret";

const ROWS = [78, 130, 182, 234, 286, 338, 390];
const COLS = Array.from({ length: 48 }, (_, i) => +(34 + i * (456 / 47)).toFixed(3));
const COL_START = 34;
const COL_STEP = 456 / 47;
const ROW_START = 78;
const ROW_STEP = 52;

interface LetterSVGProps {
  text: string;
  onTextChange: (text: string) => void;
  onKeystroke?: (isSpace: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
}

const TEXTAREA_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 32,
  top: 34,
  width: 460,
  height: 364,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  fontFamily: "'ABC Gramercy', serif",
  fontSize: 24,
  color: '#233a55',
  lineHeight: '52px',
  letterSpacing: '-0.72px',
  caretColor: 'transparent',
  padding: 0,
  overflow: 'hidden',
};

const REGARDS_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 32,
  top: 432,
  fontFamily: "'Akkurat Mono', monospace",
  fontSize: 13,
  color: '#233a55',
  letterSpacing: '-0.39px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  margin: 0,
  userSelect: 'none',
};

const NAME_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 32,
  top: 461,
  fontFamily: "'ABC Gramercy', serif",
  fontSize: 28,
  color: 'black',
  opacity: 0.3,
  letterSpacing: '-0.84px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  margin: 0,
  userSelect: 'none',
};

function measureCharPositions(textarea: HTMLTextAreaElement, text: string): { dots: Set<number>; overflows: boolean } {
  const dots = new Set<number>();
  if (!text) return { dots, overflows: false };

  let lastPos = text.length;
  while (lastPos > 0 && text[lastPos - 1] === '\n') lastPos--;
  if (lastPos === 0) return { dots, overflows: false };

  try {
    const leftEdge = getCaretCoordinates(textarea, lastPos - 1);
    const rightEdge = getCaretCoordinates(textarea, lastPos);
    const svgY = leftEdge.top + leftEdge.height / 2 + 34;
    const svgX = (leftEdge.left + rightEdge.left) / 2 + 32;

    const row = Math.round((svgY - ROW_START) / ROW_STEP);
    if (row > 6) return { dots, overflows: true };

    const col = Math.max(0, Math.min(47, Math.round((svgX - COL_START) / COL_STEP)));
    const maxDot = Math.max(0, row) * 48 + col;

    for (let i = 0; i <= maxDot; i++) dots.add(i);
  } catch {
    // Fall through with empty dots if measurement fails
  }
  return { dots, overflows: false };
}

export default function LetterSVG({ text, onTextChange, onKeystroke, onFocusChange }: LetterSVGProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeDots, setActiveDots] = useState<Set<number>>(new Set());
  const [caretPos, setCaretPos] = useState<{ top: number; left: number } | null>(null);
  const rafRef = useRef<number>(0);

  const updateCaret = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || document.activeElement !== ta) { setCaretPos(null); return; }
    try {
      const coords = getCaretCoordinates(ta, ta.selectionEnd);
      setCaretPos({ top: coords.top, left: coords.left });
    } catch {
      setCaretPos(null);
    }
  }, []);

  const measure = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setActiveDots(measureCharPositions(ta, text).dots);
  }, [text]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [measure]);

  useEffect(() => {
    let cancelled = false;
    document.fonts.load("24px 'ABC Gramercy'").then(() => {
      if (!cancelled) { measure(); updateCaret(); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [measure, updateCaret]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const handler = () => updateCaret();
    ta.addEventListener('select', handler);
    ta.addEventListener('keyup', handler);
    return () => {
      ta.removeEventListener('select', handler);
      ta.removeEventListener('keyup', handler);
    };
  }, [updateCaret]);

  useEffect(() => { updateCaret(); }, [text, updateCaret]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    // Always allow deletions
    if (newText.length <= text.length) { onTextChange(newText); return; }
    // For additions, reject if text would overflow past the last row
    const ta = textareaRef.current;
    if (!ta) return;
    const { overflows } = measureCharPositions(ta, newText);
    if (!overflows) { onTextChange(newText); onKeystroke?.(newText.slice(text.length) === ' '); }
  }, [text, onTextChange, onKeystroke]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`
        .letter-textarea::placeholder { color: #233a55; opacity: 0.2; }
        .letter-textarea:focus::placeholder { opacity: 0; }
      `}</style>

      <svg
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        width="100%" height="100%"
        viewBox="0 0 524 529"
        fill="none"
      >
        {ROWS.map((cy, ri) =>
          COLS.map((cx, ci) => {
            const isActive = activeDots.has(ri * 48 + ci);
            return (
              <circle
                key={`${ri}-${ci}`}
                cx={cx}
                cy={cy}
                r={2}
                fill="#48617F"
                opacity={isActive ? 1 : 0.2}
                style={{ transition: 'opacity 0.15s' }}
              />
            );
          })
        )}
      </svg>

      <textarea
        ref={textareaRef}
        className="letter-textarea"
        value={text}
        onChange={handleChange}
        placeholder="Share your thoughts"
        onClick={(e) => { e.stopPropagation(); updateCaret(); }}
        onFocus={() => { updateCaret(); onFocusChange?.(true); }}
        onBlur={() => { setCaretPos(null); onFocusChange?.(false); }}
        onKeyDown={() => requestAnimationFrame(updateCaret)}
        style={TEXTAREA_STYLE}
      />

      {caretPos && (
        <div
          style={{
            position: 'absolute',
            left: 32 + caretPos.left + 2,
            top: 34 + caretPos.top + 8,
            width: 6,
            height: 22,
            borderRadius: 3,
            backgroundColor: '#FF7031',
            pointerEvents: 'none',
          }}
        />
      )}

      <p style={REGARDS_STYLE}>REGARDS,</p>
      <p style={NAME_STYLE}>Your Name (or email)</p>
    </div>
  );
}
