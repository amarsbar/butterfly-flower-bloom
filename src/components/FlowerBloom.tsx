"use client";

/*
 * Figma dimension reference — all values extracted from Figma metadata
 *
 * FRAME 01 (140:1348) — collapsed state, 1728×1117
 *   Center shape (140:1349):     66×66,   bg #d2ecf2, borderRadius 32px
 *   Dot top (140:1352):          12×12,   bg #48617f, borderRadius 12px, rotate 0°,   offset (0, -73.51)
 *   Dot right (140:1350):        12×12,   bg #48617f, borderRadius 12px, rotate -15°, offset (75.48, 3.6)
 *   Dot bottom (140:1353):       12×12,   bg #48617f, borderRadius 12px, rotate 0°,   offset (0, 73.01)
 *   Dot left (140:1351):         12×12,   bg #48617f, borderRadius 12px, rotate 45°,  offset (-67.03, 0.49)
 *   Group 35 (140:1365):         55×53,   bottom decoration, offset (0, 516) from center
 *
 * FRAME 02 (140:1281) — bloomed state, 1728×1117
 *   Center shape (140:1287):     463.595×463.595, bg #feefff, borderRadius 26.026px
 *   Petal TL (140:1283):         401.782×401.782, ellipse,    offset (-200.52, -200.34)
 *   Petal TR (140:1284):         401.782×401.782, ellipse,    offset ( 201.27, -200.34)
 *   Petal BL (140:1285):         401.782×401.782, ellipse,    offset (-200.52,  201.45)
 *   Petal BR (140:1286):         401.782×401.782, ellipse,    offset ( 201.27,  201.45)
 *   Diamond top (140:1291):      55.21×55.21,   bg #ff7031, borderRadius 9.76px, rotate 45°, offset ( 27.49, -401.90)
 *   Diamond right (140:1288):    55.21×55.21,   bg #ff7031, borderRadius 9.76px, rotate 45°, offset ( 402.16,  27.99)
 *   Diamond bottom (140:1290):   55.21×55.21,   bg #ff7031, borderRadius 9.76px, rotate 45°, offset ( 27.49,  402.66)
 *   Diamond left (140:1289):     55.21×55.21,   bg #ff7031, borderRadius 9.76px, rotate 45°, offset (-402.40,  27.99)
 *   Group 35 (140:1366):         55×53,   bottom decoration, offset (0, 516) from center
 */

import { useState } from "react";
import { motion } from "motion/react";

// Exact petal offsets from Figma metadata (ellipse center − frame center)
const PETALS = [
  { x: -200.52, y: -200.34 },
  { x: 201.27, y: -200.34 },
  { x: -200.52, y: 201.45 },
  { x: 201.27, y: 201.45 },
];

// Accent dot initial positions (Frame 01) and diamond final positions (Frame 02)
const ACCENTS = [
  { initialX: 0, initialY: -73.51, finalX: 27.49, finalY: -401.90, initialRotate: 0 },
  { initialX: 75.48, initialY: 3.6, finalX: 402.16, finalY: 27.99, initialRotate: -15 },
  { initialX: 0, initialY: 73.01, finalX: 27.49, finalY: 402.66, initialRotate: 0 },
  { initialX: -67.03, initialY: 0.49, finalX: -402.40, finalY: 27.99, initialRotate: 45 },
];

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 1.2;

function DotCluster() {
  const ring = {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "1.5px solid #48617f",
  } as const;

  const filled = {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#48617f",
  } as const;

  return (
    <div
      className="absolute z-30"
      style={{ width: 55, height: 53, left: "50%", transform: "translateX(-50%)", bottom: 16 }}
    >
      <div className="absolute" style={{ ...ring, top: 0, left: "50%", transform: "translateX(-50%)" }} />
      <div className="absolute" style={{ ...ring, top: "50%", left: 0, transform: "translateY(-50%)" }} />
      <div className="absolute" style={{ ...filled, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div className="absolute" style={{ ...ring, top: "50%", right: 0, transform: "translateY(-50%)" }} />
      <div className="absolute" style={{ ...ring, bottom: 0, left: "50%", transform: "translateX(-50%)" }} />
    </div>
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
          style={{ width: 401.782, height: 401.782, backgroundColor: "#701F25" }}
          initial={false}
          animate={
            bloomed
              ? { scale: 1, x: petal.x, y: petal.y, opacity: 1 }
              : { scale: 0, x: 0, y: 0, opacity: 0 }
          }
          transition={{ duration: DURATION, ease: EASE }}
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
        transition={{ duration: DURATION, ease: EASE }}
      />

      {/* Accent dots/diamonds — 12×12 → 55.21×55.21 */}
      {ACCENTS.map((a, i) => (
        <motion.div
          key={`accent-${i}`}
          className="absolute z-20"
          initial={false}
          animate={
            bloomed
              ? {
                  width: 55.21,
                  height: 55.21,
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
          transition={{ duration: DURATION, ease: EASE }}
        />
      ))}

      <DotCluster />
    </div>
  );
}
