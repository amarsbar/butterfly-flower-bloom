"use client";

import { motion } from "motion/react";

const PETALS = [
  { x: -200, y: -200 }, // top-left
  { x: 201, y: -200 },  // top-right
  { x: -200, y: 201 },  // bottom-left
  { x: 201, y: 201 },   // bottom-right
];

const ACCENTS = [
  { initialX: 0, initialY: -73, finalX: 28, finalY: -402, initialRotate: 0, initialSize: 12 },
  { initialX: 75, initialY: 4, finalX: 402, finalY: 28, initialRotate: -15, initialSize: 15 },
  { initialX: 0, initialY: 73, finalX: 28, finalY: 402, initialRotate: 0, initialSize: 12 },
  { initialX: -67, initialY: 0, finalX: -402, finalY: 28, initialRotate: 45, initialSize: 17 },
];

export default function FlowerBloom() {
  return (
    <div className="relative flex items-center justify-center w-full h-screen bg-[#f6f6fa] overflow-hidden">
      {/* Petals - 4 ellipses that bloom outward like flower petals */}
      {PETALS.map((petal, i) => (
        <motion.div
          key={`petal-${i}`}
          className="absolute rounded-full"
          style={{ width: 402, height: 402, backgroundColor: "#6E1E24" }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
          animate={{ scale: 1, x: petal.x, y: petal.y, opacity: 1 }}
          transition={{
            duration: 1.4,
            delay: 0.3 + i * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}

      {/* Center shape - grows from small circle to large rounded rectangle */}
      <motion.div
        className="absolute z-10"
        initial={{
          width: 66,
          height: 66,
          borderRadius: 32,
          backgroundColor: "#d2ecf2",
        }}
        animate={{
          width: 464,
          height: 464,
          borderRadius: 26,
          backgroundColor: "#feefff",
        }}
        transition={{
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      {/* Accent diamonds - expand outward from small dots */}
      {ACCENTS.map((accent, i) => (
        <motion.div
          key={`accent-${i}`}
          className="absolute z-20"
          initial={{
            width: accent.initialSize,
            height: accent.initialSize,
            x: accent.initialX,
            y: accent.initialY,
            rotate: accent.initialRotate,
            borderRadius: accent.initialSize / 2,
            backgroundColor: "#48617f",
          }}
          animate={{
            width: 55,
            height: 55,
            x: accent.finalX,
            y: accent.finalY,
            rotate: 45,
            borderRadius: 10,
            backgroundColor: "#ff7031",
          }}
          transition={{
            duration: 1.2,
            delay: 0.15 + i * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}
