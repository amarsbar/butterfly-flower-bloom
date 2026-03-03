"use client";

import { useState } from "react";
import { motion } from "motion/react";

const PETALS = [
  { x: -200.52, y: -200.34 },
  { x: 201.27, y: -200.34 },
  { x: -200.52, y: 201.45 },
  { x: 201.27, y: 201.45 },
];

// Positions computed from SVG visual centers (accounting for rotation pivot)
// Diamond size is 39.04×39.04 (the 55.21 in metadata was the rotated bounding box)
const ACCENTS = [
  { initialX: 0, initialY: -73.50, finalX: -0.12, finalY: -401.90, initialRotate: 0 },
  { initialX: 75.49, initialY: 0.50, finalX: 402.16, finalY: 0.38, initialRotate: -15 },
  { initialX: 0, initialY: 73.02, finalX: -0.12, finalY: 402.66, initialRotate: 0 },
  { initialX: -75.52, initialY: 0.50, finalX: -402.40, finalY: 0.38, initialRotate: 45 },
];

const PETAL_DELAY = 0.05;

function DotCluster({ bloomed }: { bloomed: boolean }) {
  return (
    <svg
      width="55"
      height="53"
      viewBox="0 0 55 53"
      fill="none"
      className="absolute z-30"
      style={{ left: "50%", transform: "translateX(-50%)", bottom: 16 }}
    >
      <circle cx="27.5" cy="7.5" r="7" stroke="#48617F" />
      <circle cx="7.5" cy="26.5" r="7" stroke="#48617F" />
      {bloomed ? (
        <circle cx="27.5" cy="26.5" r="7" stroke="#48617F" />
      ) : (
        <circle cx="27.5" cy="26.5" r="7.5" fill="#48617F" />
      )}
      {bloomed ? (
        <circle cx="47.5" cy="26.5" r="7.5" fill="#48617F" />
      ) : (
        <circle cx="47.5" cy="26.5" r="7" stroke="#48617F" />
      )}
      <circle cx="27.5" cy="45.5" r="7" stroke="#48617F" />
    </svg>
  );
}

export default function FlowerBloom() {
  const [bloomed, setBloomed] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center w-full h-screen bg-[#f6f6fa] overflow-hidden cursor-pointer"
      onClick={() => setBloomed(true)}
    >
      {/* Petals — 401.782×401.782 ellipses */}
      {PETALS.map((petal, i) => (
        <motion.div
          key={`petal-${i}`}
          className="absolute rounded-full"
          style={{ width: 401.782, height: 401.782, backgroundColor: "#7E1F20" }}
          initial={false}
          animate={
            bloomed
              ? { x: petal.x, y: petal.y, opacity: 1 }
              : { x: 0, y: 0, opacity: 0 }
          }
          transition={{
            x: { duration: 2.5, ease: [0.49, 0.12, 0.51, 1.1], delay: 0.9 },
            y: { duration: 2.5, ease: [0.49, 0.12, 0.51, 1.1], delay: 0.9 },
            opacity: { duration: 0, delay: 0.9 },
          }}
        />
      ))}

      {/* Center shape — 66×66 → 463.595×463.595 */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={
          bloomed
            ? { width: 463.595, height: 463.595, borderRadius: 26.026, backgroundColor: "#feefff" }
            : { width: 66, height: 66, borderRadius: 32, backgroundColor: "#d2ecf2" }
        }
        transition={{ duration: 1.3, ease: [0.32, 0.03, 0.25, 1] }}
      />

      {/* Accent dots/diamonds — 12×12 → 39.04×39.04 rotated 45° */}
      {ACCENTS.map((a, i) => (
        <motion.div
          key={`accent-${i}`}
          className="absolute z-20"
          initial={false}
          animate={
            bloomed
              ? {
                  width: 39.04,
                  height: 39.04,
                  x: a.finalX,
                  y: a.finalY,
                  rotate: 45,
                  borderRadius: 9.76,
                  backgroundColor: "#ff7031",
                }
              : {
                  width: 12,
                  height: 12,
                  x: a.initialX,
                  y: a.initialY,
                  rotate: a.initialRotate,
                  borderRadius: 12,
                  backgroundColor: "#48617f",
                }
          }
          transition={{
            type: "spring",
            stiffness: 131.6,
            damping: 21.2,
            mass: 2,
          }}
        />
      ))}

      <DotCluster bloomed={bloomed} />
    </div>
  );
}
