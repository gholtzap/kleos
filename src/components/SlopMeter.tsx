import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { slopTier } from "../slop-score";
import "./slop-meter.css";

interface SlopMeterProps {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

const RADIUS = 45;
const ARC_LENGTH = Math.PI * RADIUS;

export function SlopMeter({ score, size = 96, label = "Slop-o-Meter", className }: SlopMeterProps) {
  const reducedMotion = useReducedMotion();
  // Per-instance so several meters on one page do not all paint from whichever
  // gradient happened to mount first.
  const gradientId = useId();
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const offset = ARC_LENGTH * (1 - clamped / 100);

  return (
    <div
      aria-label={`${label}: ${clamped} out of 100`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={`slop-meter ${className ?? ""}`.trim()}
      role="meter"
      style={{ width: size, height: size * 0.56 }}
    >
      <svg className="slop-meter__svg" viewBox="0 0 100 56">
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop className="slop-meter__stop--low" offset="0%" />
            <stop className="slop-meter__stop--mid" offset="50%" />
            <stop className="slop-meter__stop--high" offset="100%" />
          </linearGradient>
        </defs>

        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="var(--app-border)"
          strokeLinecap="round"
          strokeWidth={8}
        />

        <motion.path
          animate={{ strokeDashoffset: offset }}
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          initial={reducedMotion ? { strokeDashoffset: offset } : { strokeDashoffset: ARC_LENGTH }}
          stroke={`url(#${CSS.escape(gradientId)})`}
          strokeDasharray={ARC_LENGTH}
          strokeLinecap="round"
          strokeWidth={8}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>

      <div className={`slop-meter__score slop-meter__score--${slopTier(clamped)}`}>{clamped}</div>
    </div>
  );
}
