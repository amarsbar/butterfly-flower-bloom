import { useState, useEffect, useRef, useCallback } from "react";

const ROWS = [78, 130, 182, 234, 286, 338, 390];
const COLS = Array.from({ length: 48 }, (_, i) => +(34 + i * (456 / 47)).toFixed(3));
const COL_START = 34;
const COL_STEP = 456 / 47;
const ROW_START = 78;
const ROW_STEP = 52;

// Properties copied from textarea's computed style (textarea-caret-position technique)
const COPY_PROPS = [
  'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust',
  'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'textDecoration',
  'letterSpacing', 'wordSpacing', 'tabSize',
] as const;

interface LetterSVGProps {
  text: string;
  onTextChange: (text: string) => void;
  onKeystroke?: (isSpace: boolean) => void;
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
  caretColor: '#ff7031',
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

function createMirror(textarea: HTMLTextAreaElement, text: string) {
  const computed = getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.overflow = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';

  for (const prop of COPY_PROPS) {
    mirror.style[prop as any] = computed[prop as any];
  }

  const segments = text.split('\n');
  const textNodes: Text[] = [];

  segments.forEach((seg, i) => {
    if (seg.length > 0) {
      const node = document.createTextNode(seg);
      mirror.appendChild(node);
      textNodes.push(node);
    }
    if (i < segments.length - 1) {
      mirror.appendChild(document.createElement('br'));
    }
  });

  return { mirror, textNodes };
}

function measureCharPositions(textarea: HTMLTextAreaElement, text: string): { dots: Set<number>; overflows: boolean } {
  const dots = new Set<number>();
  if (!text) return { dots, overflows: false };

  const { mirror, textNodes } = createMirror(textarea, text);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const range = document.createRange();

  let maxDot = -1;
  let overflows = false;

  for (const node of textNodes) {
    const len = node.textContent!.length;
    for (let i = 0; i < len; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rects = range.getClientRects();
      if (rects.length === 0) continue;

      const rect = rects[0];
      const ry = (rect.top + rect.bottom) / 2 - mirrorRect.top;
      const svgY = ry + 34;
      const row = Math.round((svgY - ROW_START) / ROW_STEP);

      if (row > 6) { overflows = true; continue; }

      const rx = (rect.left + rect.right) / 2 - mirrorRect.left;
      const svgX = rx + 32;
      const col = Math.max(0, Math.min(47, Math.round((svgX - COL_START) / COL_STEP)));

      const idx = Math.max(0, row) * 48 + col;
      if (idx > maxDot) maxDot = idx;
    }
  }

  document.body.removeChild(mirror);

  for (let i = 0; i <= maxDot; i++) dots.add(i);
  return { dots, overflows };
}

export default function LetterSVG({ text, onTextChange, onKeystroke }: LetterSVGProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeDots, setActiveDots] = useState<Set<number>>(new Set());
  const rafRef = useRef<number>(0);

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
      if (!cancelled) measure();
    });
    return () => { cancelled = true; };
  }, [measure]);

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
      <style>{`.letter-textarea::placeholder { color: #233a55; opacity: 0.2; }`}</style>

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
        onClick={(e) => e.stopPropagation()}
        style={TEXTAREA_STYLE}
      />

      <p style={REGARDS_STYLE}>REGARDS,</p>
      <p style={NAME_STYLE}>Your Name (or email)</p>
    </div>
  );
}
