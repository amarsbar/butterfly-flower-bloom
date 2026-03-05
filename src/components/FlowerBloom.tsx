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
    y: custom?.isMobile && custom?.isFocused ? -180 : 0,
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
  fontFamily: "'ABC Gramercy', serif",
  fontWeight: 300,
  fontStyle: 'italic',
  fontSize: 90,
  color: '#48617f',
  letterSpacing: '-2.7px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const msgTitleVariants = {
  seed: { opacity: 0, y: 0, transition: { duration: 0, delay: 0 } },
  bloom: { opacity: 0, y: 0, transition: { duration: 0, delay: 0 } },
  message: (custom: { isMobile: boolean; isFocused: boolean } | undefined) => ({
    opacity: 1,
    y: custom?.isMobile && custom?.isFocused ? -180 : 0,
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

type MsgDot = { x: number; y: number; col: number };

const MSG_DOTS: MsgDot[] = MSG_DOT_COLS.flatMap(([colX, rows], col) =>
  rows.flatMap(y => [
    { x: colX, y, col },
    { x: -colX, y, col },
  ])
);



// Build right→left mirror index map (horizontal inversion: x ↔ -x)
const DOT_MIRRORS = new Map<number, number>();
MSG_DOTS.forEach((dot, i) => {
  if (dot.x > 0) {
    const mirrorIdx = MSG_DOTS.findIndex(
      (d, j) => j !== i && d.x === -dot.x && Math.abs(d.y - dot.y) < 0.01
    );
    if (mirrorIdx >= 0) DOT_MIRRORS.set(i, mirrorIdx);
  }
});
const RIGHT_DOT_INDICES = [...DOT_MIRRORS.keys()];
const CENTER_ROW_INDICES = MSG_DOTS.reduce<number[]>((acc, dot, i) => {
  if (Math.abs(dot.y + 24.28) < 0.01) acc.push(i);
  return acc;
}, []);

const MOBILE_DOT_COLS: [number, number[]][] = [
  [152.7, [149.4]],
  [187.5, [113.2, 149.4, 185.6]],
  [222.2, [113.2, 149.4, 185.6]],
  [257.0, [113.2, 149.4, 185.6]],
];

const MOBILE_DOTS: MsgDot[] = MOBILE_DOT_COLS.flatMap(([colX, rows], col) =>
  rows.flatMap(y => [
    { x: colX, y, col },
    { x: -colX, y, col },
  ])
);

const MOBILE_DOT_MIRRORS = new Map<number, number>();
MOBILE_DOTS.forEach((dot, i) => {
  if (dot.x > 0) {
    const mirrorIdx = MOBILE_DOTS.findIndex(
      (d, j) => j !== i && d.x === -dot.x && Math.abs(d.y - dot.y) < 0.01
    );
    if (mirrorIdx >= 0) MOBILE_DOT_MIRRORS.set(i, mirrorIdx);
  }
});
const MOBILE_RIGHT_DOT_INDICES = [...MOBILE_DOT_MIRRORS.keys()];
const MOBILE_CENTER_ROW_INDICES = MOBILE_DOTS.reduce<number[]>((acc, dot, i) => {
  if (Math.abs(dot.y - 149.4) < 0.01) acc.push(i);
  return acc;
}, []);

const SEND_BUTTON: React.CSSProperties = {
  width: 185,
  height: 58,
  borderRadius: 29,
  backgroundColor: '#ff7031',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'ABC Gramercy', serif",
  fontSize: 24,
  color: '#d2ecf2',
  cursor: 'pointer',
  userSelect: 'none',
};

const sendVariants = {
  hidden: (c: { isMobile?: boolean, isFocused?: boolean }) => ({
    y: c?.isMobile && c?.isFocused ? -180 : 0,
    opacity: 0,
    transition: { duration: 0 }
  }),
  visibleDesktop: { y: 315, opacity: 1, transition: msgSpring },
  visibleMobileUnfocused: { y: 330, opacity: 1, transition: msgSpring },
  visibleMobileFocused: { y: 149.4, opacity: 1, transition: msgSpring },
};

const COUNTER_BOX: React.CSSProperties = {
  width: 13,
  padding: 2,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Akkurat Mono', monospace",
  fontSize: 13,
  color: 'black',
  letterSpacing: '-0.39px',
  lineHeight: 1,
  userSelect: 'none',
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
  const [dotsCascaded, setDotsCascaded] = useState(false);
  const [mobileDotsCascaded, setMobileDotsCascaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dotTimers = useRef<Map<number, number>>(new Map());
  const colorTimers = useRef<Map<number, number>>(new Map());

  const updateScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isPortrait = el.clientHeight > el.clientWidth;
    setIsMobile(isPortrait);
    if (isPortrait) {
      const scaleW = el.clientWidth / 569;
      const scaleH = el.clientHeight / 1234;
      setScale(Math.min(scaleW, scaleH));
    } else {
      setScale(Math.min(el.clientWidth / DESIGN_W, el.clientHeight / DESIGN_H));
    }
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  const flashDots = useCallback((indices: number[]) => {
    setGlowingDots(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.add(i));
      return next;
    });
    setOrangeDots(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.add(i));
      return next;
    });
    for (const i of indices) {
      const prevDot = dotTimers.current.get(i);
      if (prevDot !== undefined) clearTimeout(prevDot);
      const prevColor = colorTimers.current.get(i);
      if (prevColor !== undefined) clearTimeout(prevColor);
      dotTimers.current.set(i, window.setTimeout(() => {
        dotTimers.current.delete(i);
        setGlowingDots(prev => {
          const next = new Set(prev);
          next.delete(i);
          return next;
        });
        // Keep orange for 0.3s more (fade-out duration), then snap to grey
        colorTimers.current.set(i, window.setTimeout(() => {
          colorTimers.current.delete(i);
          setOrangeDots(prev => {
            const next = new Set(prev);
            next.delete(i);
            return next;
          });
        }, 300));
      }, 600));
    }
  }, []);

  const handleKeystrokeGlow = useCallback((isSpace: boolean) => {
    const activeRightIndices = isMobile && isFocused ? MOBILE_RIGHT_DOT_INDICES : RIGHT_DOT_INDICES;
    const activeMirrors = isMobile && isFocused ? MOBILE_DOT_MIRRORS : DOT_MIRRORS;
    const activeCenter = isMobile && isFocused ? MOBILE_CENTER_ROW_INDICES : CENTER_ROW_INDICES;

    if (isSpace) {
      flashDots(activeCenter);
    } else {
      if (activeRightIndices.length === 0) return;
      const rightIdx = activeRightIndices[Math.floor(Math.random() * activeRightIndices.length)];
      const leftIdx = activeMirrors.get(rightIdx);
      if (leftIdx === undefined) return;
      flashDots([rightIdx, leftIdx]);
    }
  }, [flashDots, isMobile, isFocused]);

  useEffect(() => {
    if (page !== 'message') {
      setGlowingDots(new Set());
      setOrangeDots(new Set());
      dotTimers.current.forEach(clearTimeout);
      dotTimers.current.clear();
      colorTimers.current.forEach(clearTimeout);
      colorTimers.current.clear();
    }
  }, [page]);

  useEffect(() => {
    return () => {
      dotTimers.current.forEach(clearTimeout);
      colorTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (page === 'message') {
      const timer = setTimeout(() => setDotsCascaded(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setDotsCascaded(false);
    }
  }, [page]);

  useEffect(() => {
    if (isFocused && isMobile) {
      const timer = setTimeout(() => setMobileDotsCascaded(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setMobileDotsCascaded(false);
    }
  }, [isFocused, isMobile]);

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

        {/* Decorative dots (Desktop) */}
        {!isMobile && MSG_DOTS.map((dot, i) => {
          const isGlowing = glowingDots.has(i);
          return (
            <motion.div
              key={`msg-dot-${i}`}
              className="absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: page === 'message' ? (isGlowing ? 1 : 0.2) : 0 }}
              transition={{
                duration: (isGlowing || dotsCascaded) ? 0.3 : 0,
                ease: "linear",
                delay: page === 'message' ? (isGlowing || dotsCascaded ? 0 : 0.5 + dot.col * 0.12) : 0
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: orangeDots.has(i) ? '#ff7031' : '#48617f',
                left: `calc(50% + ${dot.x - 4}px)`,
                top: `calc(50% + ${dot.y - 4}px)`,
              }}
            />
          );
        })}

        {/* Decorative dots (Mobile) */}
        {isMobile && isFocused && MOBILE_DOTS.map((dot, i) => {
          const isGlowing = glowingDots.has(i);
          return (
            <motion.div
              key={`mobile-msg-dot-${i}`}
              className="absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: isGlowing ? 1 : 0.2 }}
              transition={{
                duration: (isGlowing || mobileDotsCascaded) ? 0.3 : 0,
                ease: "linear",
                delay: isGlowing || mobileDotsCascaded ? 0 : 0.3 + dot.col * 0.12
              }}
              style={{
                width: 11.6,
                height: 11.6,
                borderRadius: 2.9,
                backgroundColor: orangeDots.has(i) ? '#ff7031' : '#48617f',
                left: `calc(50% + ${dot.x - 5.8}px)`,
                top: `calc(50% + ${dot.y - 5.8}px)`,
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