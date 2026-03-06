"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import LetterSVG from "./LetterSVG";

type Page = "menu" | "note" | "message";

const PAGE_VARIANT: Record<Page, string> = { menu: "seed", note: "bloom", message: "message" };

const DESIGN_W = 1728;
const DESIGN_H = 1117;
const FLOWER_SPAN = 870;

const PETALS = [
  { x: -200.52, y: -200.34 },
  { x: 201.27, y: -200.34 },
  { x: -200.52, y: 201.45 },
  { x: 201.27, y: 201.45 },
];

// Diamond size is 39.04x39.04 (the 55.21 in metadata was the rotated bounding box)
const ACCENTS = [
  { initialX: 0, initialY: -73.50, finalX: -0.12, finalY: -401.90, msgX: 0, msgY: -514.9, initialRotate: 0 },
  { initialX: 75.49, initialY: 0.50, finalX: 402.16, finalY: 0.38, msgX: 820.61, msgY: -21.89, initialRotate: -15 },
  { initialX: 0, initialY: 73.02, finalX: -0.12, finalY: 402.66, msgX: 0, msgY: 515.1, initialRotate: 0 },
  { initialX: -75.52, initialY: 0.50, finalX: -402.40, finalY: 0.38, msgX: -820.39, msgY: -21.89, initialRotate: 45 },
];

// Navigation cluster (cross pattern): center = menu, right = note
const NAV_DOTS = [
  { cx: 27.5, cy: 7.5, page: "message" as Page },
  { cx: 7.5, cy: 26.5, page: null },
  { cx: 27.5, cy: 26.5, page: "menu" as Page },
  { cx: 47.5, cy: 26.5, page: "note" as Page },
  { cx: 27.5, cy: 45.5, page: null },
];

// --- Variants ---

type Petal = (typeof PETALS)[number];
type Accent = (typeof ACCENTS)[number];

const centerEase = [0.32, 0.03, 0.25, 1] as const;
const centerTransition = { duration: 0.3, ease: centerEase };
const centerSeedTransition = { duration: 0.12, ease: centerEase };

const centerVariants = {
  seed: { width: 66, height: 66, borderRadius: 32, backgroundColor: "#d2ecf2", transition: centerSeedTransition },
  bloom: { width: 463.595, height: 463.595, borderRadius: 26.026, backgroundColor: "#feefff", transition: centerTransition },
  message: (custom: { isMobile: boolean; isFocused: boolean } | undefined) => ({
    width: 524, height: 529, borderRadius: 32, backgroundColor: "#d2ecf2",
    y: custom?.isMobile && custom?.isFocused ? -230 : 0,
    transition: centerTransition
  }),
};

const petalEase = [0.06, 0.06, 0.51, 1.1] as const;
const petalTransition = {
  x: { duration: 0.25, ease: petalEase, delay: 0.17 },
  y: { duration: 0.25, ease: petalEase, delay: 0.17 },
  opacity: { duration: 0, delay: 0.17 },
};

const petalSeedTransition = {
  x: { duration: 0.12, ease: petalEase },
  y: { duration: 0.12, ease: petalEase },
  opacity: { duration: 0 },
};

const petalVariants = {
  seed: { x: 0, y: 0, opacity: 0, transition: petalSeedTransition },
  bloom: (p: Petal) => ({ x: p.x, y: p.y, opacity: 1, transition: petalTransition }),
  message: { x: 0, y: 0, opacity: 0, transition: petalSeedTransition },
};

const accentSpring = { type: "spring" as const, stiffness: 131.6, damping: 21.2, mass: 2 };
const msgSpring = { type: "spring" as const, stiffness: 158.5, damping: 38.3, mass: 4 };
const accentSeedSpring = { type: "spring" as const, stiffness: 400, damping: 35, mass: 1 };

const accentVariants = {
  seed: (a: Accent & { isMobile?: boolean, isFocused?: boolean }) => ({
    width: 12, height: 12, x: a.initialX, y: a.initialY,
    rotate: a.initialRotate, borderRadius: 12, backgroundColor: "#48617f", opacity: 1, scale: 1,
    transition: accentSeedSpring,
  }),
  bloom: (a: Accent & { isMobile?: boolean, isFocused?: boolean }) => ({
    width: 39.04, height: 39.04, x: a.finalX, y: a.finalY,
    rotate: 45, borderRadius: 9.76, backgroundColor: "#ff7031", opacity: 1, scale: 1,
    transition: accentSpring,
  }),
  message: (a: Accent & { isMobile?: boolean, isFocused?: boolean }) => ({
    width: 39.04, height: 39.04, x: a.msgX, y: a.msgY,
    rotate: 135, borderRadius: 9.76, backgroundColor: "#9C84F4",
    opacity: a.isMobile && a.isFocused ? 0 : 1,
    scale: a.isMobile && a.isFocused ? 0.5 : 1,
    transition: a.isMobile && a.isFocused ? { opacity: { duration: 0 }, ...msgSpring } : msgSpring,
  }),
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Akkurat Mono', monospace",
  fontSize: 16,
  color: '#5e748e',
  letterSpacing: '-0.64px',
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const LABEL_CLICKABLE: React.CSSProperties = { ...LABEL_STYLE, cursor: 'pointer' };

// Position label wrapper at design center, then offset with translate
const labelPos = (transform: string): React.CSSProperties => ({
  position: 'absolute', left: '50%', top: '50%', transform,
});

// Offsets from design center (864, 558.5): Message above top dot, Note right of
// right dot, Readings left of left dot, About below bottom dot
const LABELS: { text: string; page?: Page; style: React.CSSProperties }[] = [
  { text: "Message", page: "message" as Page, style: labelPos('translate(-50%, -109.5px)') },
  { text: "Readings", style: labelPos('translate(calc(-100% - 91px), -9.5px)') },
  { text: "Note", page: "note", style: labelPos('translate(95px, -8.5px)') },
  { text: "About", style: labelPos('translate(-50%, 91.5px)') },
];

const labelVariants = {
  seed: { opacity: 1, transition: { duration: 0.3, delay: 0.3 } },
  bloom: { opacity: 0, transition: { duration: 0.15 } },
  message: { opacity: 0, transition: { duration: 0.15 } },
};

const letterVariants = {
  seed: { opacity: 0, transition: { duration: 0.15 } },
  bloom: { opacity: 0, transition: { duration: 0.15 } },
  message: { opacity: 1, transition: { duration: 0.2, delay: 0.15 } },
};

const MSG_TITLE_STYLE: React.CSSProperties = {
  fontFamily: "'ABC Gramercy', serif", fontWeight: 300, fontStyle: 'italic', fontSize: 90,
  color: '#48617f', letterSpacing: '-2.7px', lineHeight: 1, whiteSpace: 'nowrap', userSelect: 'none',
};

const msgTitleVariants = {
  seed: { opacity: 0, y: 0, transition: { duration: 0, delay: 0 } },
  bloom: { opacity: 0, y: 0, transition: { duration: 0, delay: 0 } },
  message: (custom: { isMobile: boolean; isFocused: boolean } | undefined) => ({
    opacity: 1,
    y: custom?.isMobile && custom?.isFocused ? -230 : 0,
    transition: {
      y: centerTransition,
      opacity: { duration: 0, delay: 0.35 }
    }
  }),
};

const COUNTER_POSITIONS = [
  { x: -632, y: -24 },
  { x: 630, y: -24 },
];

type CounterPos = (typeof COUNTER_POSITIONS)[number];

const counterVariants = {
  seed: { x: 0, y: 0, opacity: 0, transition: accentSeedSpring },
  bloom: { x: 0, y: 0, opacity: 0, transition: accentSeedSpring },
  message: (p: CounterPos & { isMobile?: boolean }) => ({
    x: p.x, y: p.y, opacity: p.isMobile ? 0 : 1, transition: msgSpring
  }),
};

// Decorative dots: 4 columns per side, mirrored left/right, triangular pattern
const MSG_DOT_COLS: [number, number[]][] = [
  [309, [-218.5, -169.95, -121.39, -72.83, -24.28, 24.28, 72.83, 121.39, 169.95, 218.5]],
  [360, [-169.95, -121.39, -72.83, -24.28, 24.28, 72.83, 121.39, 169.95]],
  [411, [-72.83, -24.28, 24.28]],
  [462, [-24.28]],
];

const MOBILE_DOT_COLS: [number, number[]][] = [
  [152.7, [99.4]],
  [187.5, [63.2, 99.4, 135.6]],
  [222.2, [63.2, 99.4, 135.6]],
  [257.0, [63.2, 99.4, 135.6]],
];

type MsgDot = { x: number; y: number; col: number };

function createDotGrid(cols: [number, number[]][], centerY: number) {
  const dots: MsgDot[] = cols.flatMap(([colX, rows], col) =>
    rows.flatMap(y => [{ x: colX, y, col }, { x: -colX, y, col }])
  );
  const mirrors = new Map<number, number>();
  dots.forEach((dot, i) => {
    if (dot.x > 0) {
      const mirrorIdx = dots.findIndex(d => d !== dot && d.x === -dot.x && Math.abs(d.y - dot.y) < 0.01);
      if (mirrorIdx >= 0) mirrors.set(i, mirrorIdx);
    }
  });

  return {
    dots,
    mirrors,
    rightIndices: [...mirrors.keys()],
    centerRowIndices: dots.reduce<number[]>((acc, dot, i) => {
      if (Math.abs(dot.y - centerY) < 0.01) acc.push(i);
      return acc;
    }, [])
  };
}

const DESKTOP_GRID = createDotGrid(MSG_DOT_COLS, -24.28);
const MOBILE_GRID = createDotGrid(MOBILE_DOT_COLS, 99.4);

const SEND_BUTTON: React.CSSProperties = {
  width: 167, height: 58, borderRadius: 1000, backgroundColor: '#ff7031', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontFamily: "'ABC Gramercy', serif", fontSize: 24, color: '#d2ecf2', letterSpacing: '-0.72px',
  cursor: 'pointer', userSelect: 'none',
};

const sendVariants = {
  hidden: (c: { isMobile?: boolean, isFocused?: boolean }) => ({
    y: c?.isMobile && c?.isFocused ? -230 : 0,
    scale: 1,
    opacity: 0,
    transition: { duration: 0 }
  }),
  visibleDesktop: { y: 315, scale: 1, opacity: 1, transition: msgSpring },
  visibleMobileUnfocused: { y: 330, scale: 1.45, opacity: 1, transition: msgSpring },
  visibleMobileFocused: { y: 99.4, scale: 1.45, opacity: 1, transition: msgSpring },
};

const COUNTER_BOX: React.CSSProperties = {
  width: 13, padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Akkurat Mono', monospace", fontSize: 13, color: 'black', letterSpacing: '-0.39px',
  lineHeight: 1, userSelect: 'none',
};

// --- Components ---

function CharCounter({ count }: { count: number }) {
  const chars = [...String(count).padStart(3, '0')];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {chars.map((ch, i) => (
        <div key={i} style={{ ...COUNTER_BOX, backgroundColor: '#bed8de' }}>
          {ch}
        </div>
      ))}
    </div>
  );
}

function DotCluster({ activePage }: { activePage: Page }) {
  return (
    <div
      className="absolute z-30 flex items-center justify-center overflow-hidden"
      style={{
        right: "max(16px, env(safe-area-inset-right, 16px))",
        bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        width: 56,
        height: 56,
        borderRadius: 1000,
        border: '1px solid #48617f',
      }}
    >
      <svg width="42" height="40" viewBox="0 0 55 53" fill="none">
        {NAV_DOTS.map((dot, i) => {
          const isActive = dot.page === activePage;
          return (
            <circle
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r={isActive ? 7.5 : 7}
              {...(isActive ? { fill: "#48617F" } : { stroke: "#48617F" })}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function FlowerBloom() {
  const [page, setPage] = useState<Page>("menu");
  const [messageText, setMessageText] = useState("");
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [glowingDots, setGlowingDots] = useState<Set<number>>(new Set());
  const [orangeDots, setOrangeDots] = useState<Set<number>>(new Set());
  const [cascaded, setCascaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dotTimers = useRef<Map<number, number>>(new Map());
  const colorTimers = useRef<Map<number, number>>(new Map());

  const updateScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isPortrait = el.clientHeight > el.clientWidth;
    setIsMobile(isPortrait);
    setScale(Math.min(el.clientWidth / (isPortrait ? 569 : DESIGN_W), el.clientHeight / (isPortrait ? 1234 : DESIGN_H)));
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  const flashDots = useCallback((indices: number[]) => {
    setGlowingDots(prev => new Set([...prev, ...indices]));
    setOrangeDots(prev => new Set([...prev, ...indices]));
    for (const i of indices) {
      clearTimeout(dotTimers.current.get(i));
      clearTimeout(colorTimers.current.get(i));
      dotTimers.current.set(i, window.setTimeout(() => {
        dotTimers.current.delete(i);
        setGlowingDots(p => { const s = new Set(p); s.delete(i); return s; });
        colorTimers.current.set(i, window.setTimeout(() => {
          colorTimers.current.delete(i);
          setOrangeDots(p => { const s = new Set(p); s.delete(i); return s; });
        }, 300));
      }, 600));
    }
  }, []);

  const handleKeystrokeGlow = useCallback((isSpace: boolean) => {
    const grid = isMobile && isFocused ? MOBILE_GRID : DESKTOP_GRID;
    if (isSpace) return flashDots(grid.centerRowIndices);
    if (!grid.rightIndices.length) return;
    const rightIdx = grid.rightIndices[Math.floor(Math.random() * grid.rightIndices.length)];
    const leftIdx = grid.mirrors.get(rightIdx);
    if (leftIdx !== undefined) flashDots([rightIdx, leftIdx]);
  }, [flashDots, isMobile, isFocused]);

  useEffect(() => {
    if (page !== 'message') {
      setGlowingDots(new Set()); setOrangeDots(new Set());
      dotTimers.current.forEach(clearTimeout); dotTimers.current.clear();
      colorTimers.current.forEach(clearTimeout); colorTimers.current.clear();
    }
    return () => {
      dotTimers.current.forEach(clearTimeout); colorTimers.current.forEach(clearTimeout);
    };
  }, [page]);

  const isMobileActive = page === 'message' && isMobile && isFocused;
  const isDotsActive = (page === 'message' && !isMobile) || isMobileActive;

  useEffect(() => {
    if (!isDotsActive) return setCascaded(false);
    const timer = setTimeout(() => setCascaded(true), isMobileActive ? 1200 : 2000);
    return () => clearTimeout(timer);
  }, [isDotsActive, isMobileActive]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center w-full h-svh bg-[#f6f6fa] overflow-hidden${page === "note" ? " cursor-pointer" : ""}`}
      onClick={() => { if (page === "note") setPage("menu"); }}
    >
      <motion.div
        className="relative flex items-center justify-center"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          margin: `${-(DESIGN_H * (1 - scale)) / 2}px ${-(DESIGN_W * (1 - scale)) / 2}px`,
        }}
        initial={false}
        animate={PAGE_VARIANT[page]}
      >
        {/* Petals */}
        {PETALS.map((petal, i) => (
          <motion.div
            key={i}
            custom={petal}
            variants={petalVariants}
            className="absolute rounded-full"
            style={{ width: 401.782, height: 401.782, backgroundColor: "#7E1F20" }}
          />
        ))}

        {/* Center shape */}
        <motion.div className="absolute z-10 overflow-hidden" variants={centerVariants} custom={{ isMobile, isFocused }}>
          <motion.div className="w-full h-full" variants={letterVariants}>
            <LetterSVG text={messageText} onTextChange={setMessageText} onKeystroke={handleKeystrokeGlow} onFocusChange={setIsFocused} />
          </motion.div>
        </motion.div>

        {/* Accent diamonds */}
        {ACCENTS.map((accent, i) => (
          <motion.div
            key={i}
            custom={{ ...accent, isMobile, isFocused }}
            variants={accentVariants}
            className="absolute z-20"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (page === "message") setPage("menu");
              else if (page === "menu" && i === 0) setPage("message");
              else if (page === "menu" && i === 1) setPage("note");
            }}
            style={{ cursor: 'pointer' }}
          />
        ))}

        {/* Message title */}
        <div style={{ ...labelPos('translate(-50%, -341.5px)'), zIndex: 11 }}>
          <motion.p custom={{ isMobile, isFocused }} variants={msgTitleVariants} style={MSG_TITLE_STYLE}>Message</motion.p>
        </div>

        {/* Decorative dots */}
        {(isMobile ? MOBILE_GRID.dots : DESKTOP_GRID.dots).map((dot, i) => {
          const isGlowing = glowingDots.has(i);
          const size = isMobile ? 11.6 : 8;
          const radius = size / 2;
          const initialDelayBase = isMobile ? 0.3 : 0.5;

          return (
            <motion.div
              key={`${isMobile ? 'm-' : 'd-'}dot-${i}`}
              className="absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: isDotsActive ? (isGlowing ? 1 : 0.2) : 0 }}
              transition={{
                duration: isDotsActive ? ((isGlowing || cascaded) ? 0.3 : 0) : 0,
                ease: "linear",
                delay: isDotsActive ? (isGlowing || cascaded ? 0 : initialDelayBase + dot.col * 0.12) : 0
              }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 4,
                backgroundColor: orangeDots.has(i) ? '#ff7031' : '#48617f',
                left: `calc(50% + ${dot.x - radius}px)`,
                top: `calc(50% + ${dot.y - radius}px)`,
              }}
            />
          );
        })}

        {/* Character counters */}
        {COUNTER_POSITIONS.map((pos, i) => (
          <motion.div key={`counter-${i}`} custom={{ ...pos, isMobile }} variants={counterVariants} className="absolute">
            <CharCounter count={messageText.length} />
          </motion.div>
        ))}

        {/* Send button */}
        <motion.div
          custom={{ isMobile, isFocused }}
          initial="hidden"
          animate={page === 'message' && messageText.length > 0 ? (isMobile ? (isFocused ? "visibleMobileFocused" : "visibleMobileUnfocused") : "visibleDesktop") : "hidden"}
          variants={sendVariants}
          className="absolute"
          style={SEND_BUTTON}
          onPointerDown={(e) => { e.preventDefault(); }}
          onClick={(e) => e.stopPropagation()}
        >
          Send
        </motion.div>

        {/* Labels */}
        {LABELS.map(({ text, page: targetPage, style }) => (
          <div key={text} style={style}>
            <motion.p
              variants={labelVariants}
              style={targetPage ? LABEL_CLICKABLE : LABEL_STYLE}
              {...(targetPage ? { onClick: () => setPage(targetPage) } : {})}
            >
              {text}
            </motion.p>
          </div>
        ))}
      </motion.div>

      <DotCluster activePage={page} />
    </div>
  );
}