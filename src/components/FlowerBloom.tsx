"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";

type Page = "menu" | "note";

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
  { initialX: 0, initialY: -73.50, finalX: -0.12, finalY: -401.90, initialRotate: 0 },
  { initialX: 75.49, initialY: 0.50, finalX: 402.16, finalY: 0.38, initialRotate: -15 },
  { initialX: 0, initialY: 73.02, finalX: -0.12, finalY: 402.66, initialRotate: 0 },
  { initialX: -75.52, initialY: 0.50, finalX: -402.40, finalY: 0.38, initialRotate: 45 },
];

// Navigation cluster (cross pattern): center = menu, right = note
const NAV_DOTS = [
  { cx: 27.5, cy: 7.5, page: null },
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
const centerSeedTransition = { duration: 0.15, ease: centerEase, delay: 0.15 };

const centerVariants = {
  seed:  { width: 66, height: 66, borderRadius: 32, backgroundColor: "#d2ecf2", transition: centerSeedTransition },
  bloom: { width: 463.595, height: 463.595, borderRadius: 26.026, backgroundColor: "#feefff", transition: centerTransition },
};

const petalEase = [0.06, 0.06, 0.51, 1.1] as const;
const petalTransition = {
  x: { duration: 0.25, ease: petalEase, delay: 0.17 },
  y: { duration: 0.25, ease: petalEase, delay: 0.17 },
  opacity: { duration: 0, delay: 0.17 },
};

const petalSeedTransition = {
  x: { duration: 0.15, ease: petalEase },
  y: { duration: 0.15, ease: petalEase },
  opacity: { duration: 0, delay: 0.15 },
};

const petalVariants = {
  seed:  { x: 0, y: 0, opacity: 0, transition: petalSeedTransition },
  bloom: (p: Petal) => ({ x: p.x, y: p.y, opacity: 1, transition: petalTransition }),
};

const accentSpring = { type: "spring" as const, stiffness: 131.6, damping: 21.2, mass: 2 };
const accentSeedSpring = { type: "spring" as const, stiffness: 300, damping: 30, mass: 2, delay: 0.15 };

const accentVariants = {
  seed: (a: Accent) => ({
    width: 12, height: 12, x: a.initialX, y: a.initialY,
    rotate: a.initialRotate, borderRadius: 12, backgroundColor: "#48617f",
    transition: accentSeedSpring,
  }),
  bloom: (a: Accent) => ({
    width: 39.04, height: 39.04, x: a.finalX, y: a.finalY,
    rotate: 45, borderRadius: 9.76, backgroundColor: "#ff7031",
    transition: accentSpring,
  }),
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Akkurat Mono', monospace",
  fontSize: 16,
  color: '#5e748e',
  letterSpacing: '-0.64px',
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
};

const LABEL_CLICKABLE: React.CSSProperties = { ...LABEL_STYLE, cursor: 'pointer' };

// Position label wrapper at design center, then offset with translate
const labelPos = (transform: string): React.CSSProperties => ({
  position: 'absolute', left: '50%', top: '50%', transform,
});

// Offsets from design center (864, 558.5): Message above top dot, Note right of
// right dot, Readings left of left dot, About below bottom dot
const LABELS: { text: string; page?: Page; style: React.CSSProperties }[] = [
  { text: "Message", style: labelPos('translate(-50%, -109.5px)') },
  { text: "Readings", style: labelPos('translate(calc(-100% - 91px), -9.5px)') },
  { text: "Note", page: "note", style: labelPos('translate(95px, -8.5px)') },
  { text: "About", style: labelPos('translate(-50%, 91.5px)') },
];

const labelVariants = {
  seed: { opacity: 1, transition: { duration: 0.3, delay: 0.5 } },
  bloom: { opacity: 0, transition: { duration: 0.15 } },
};

// --- Components ---

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
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isPortrait = el.clientHeight >= el.clientWidth;
    setScale(isPortrait
      ? el.clientWidth / FLOWER_SPAN
      : Math.min(el.clientWidth / DESIGN_W, el.clientHeight / DESIGN_H));
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

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
        animate={page === "note" ? "bloom" : "seed"}
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
        <motion.div className="absolute z-10" variants={centerVariants} />

        {/* Accent diamonds */}
        {ACCENTS.map((accent, i) => (
          <motion.div
            key={i}
            custom={accent}
            variants={accentVariants}
            className="absolute z-20"
            {...(i === 1 ? { onClick: () => setPage("note"), style: { cursor: 'pointer' } } : {})}
          />
        ))}

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