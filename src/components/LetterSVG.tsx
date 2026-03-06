import { useState, useEffect, useRef, useCallback } from "react";
import getCaretCoordinates from "textarea-caret";

const ROWS = [78, 130, 182, 234, 286, 338, 390];
const COL_START = 34;
const COL_STEP = 456 / 47;
const ROW_START = 78;
const ROW_STEP = 52;
const COLS = Array.from({ length: 48 }, (_, i) => +(COL_START + i * COL_STEP).toFixed(3));

interface LetterSVGProps {
  text: string;
  onTextChange: (text: string) => void;
  onKeystroke?: (isSpace: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
}

const TEXTAREA_STYLE: React.CSSProperties = {
  position: 'absolute', left: 32, top: 34, width: 460, height: 364, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
  fontFamily: "'ABC Gramercy', serif", fontSize: 24, color: '#233a55', lineHeight: '52px', letterSpacing: '-0.72px', caretColor: 'transparent', padding: 0, overflow: 'hidden',
};

const REGARDS_STYLE: React.CSSProperties = {
  position: 'absolute', left: 32, top: 432, margin: 0, fontFamily: "'Akkurat Mono', monospace", fontSize: 13, color: '#233a55', letterSpacing: '-0.39px', lineHeight: 1, whiteSpace: 'nowrap', userSelect: 'none',
};

const NAME_STYLE: React.CSSProperties = {
  position: 'absolute', left: 32, top: 461, margin: 0, fontFamily: "'ABC Gramercy', serif", fontSize: 28, color: 'black', opacity: 0.3, letterSpacing: '-0.84px', lineHeight: 1, whiteSpace: 'nowrap', userSelect: 'none',
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
  const [caretOffset, setCaretOffset] = useState(8);
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
    let cancelled = false;
    document.fonts.load("24px 'ABC Gramercy'").then(() => {
      if (!cancelled) { measure(); updateCaret(); }
    }).catch(() => { });

    const ta = textareaRef.current;
    if (ta) {
      ta.addEventListener('select', updateCaret);
      ta.addEventListener('keyup', updateCaret);
    }

    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      setCaretOffset(3);
    }

    return () => {
      cancelled = true;
      if (ta) {
        ta.removeEventListener('select', updateCaret);
        ta.removeEventListener('keyup', updateCaret);
      }
    };
  }, [measure, updateCaret]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(measure);
    updateCaret();
    return () => cancelAnimationFrame(rafRef.current);
  }, [measure, updateCaret, text]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= text.length) return onTextChange(newText);
    if (!textareaRef.current || measureCharPositions(textareaRef.current, newText).overflows) return;
    onTextChange(newText); onKeystroke?.(newText.endsWith(' '));
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
            top: 34 + caretPos.top + caretOffset,
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
