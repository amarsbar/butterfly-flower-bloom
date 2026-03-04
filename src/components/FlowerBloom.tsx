"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";

type Page = "menu" | "note";

const DESIGN_W = 1728;
const DESIGN_H = 1117;

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
  x: { duration: 0.6, ease: petalEase, delay: 0.17 },
  y: { duration: 0.6, ease: petalEase, delay: 0.17 },
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

// --- Components ---

function DotCluster({ activePage }: { activePage: Page }) {
  return (
    <svg
      width="55" height="53" viewBox="0 0 55 53" fill="none"
      className="absolute z-30"
      style={{ left: "50%", transform: "translateX(-50%)", bottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
    >
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
  );
}

export default function FlowerBloom() {
  const [page, setPage] = useState<Page>("menu");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="relative flex items-center justify-center w-full h-dvh bg-[#f6f6fa] overflow-hidden cursor-pointer"
      onClick={() => setPage(page === "menu" ? "note" : "menu")}
    >
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})` }}
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
          <motion.div key={i} custom={accent} variants={accentVariants} className="absolute z-20" />
        ))}
      </motion.div>

      <DotCluster activePage={page} />
    </div>
  );
}