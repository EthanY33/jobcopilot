import styles from "./marketing.module.css";

type OrbColor = "violet" | "azure";

interface DriftOrbProps {
  size: number;
  color: OrbColor;
  opacity: number;
  /** Any of these CSS positional values; pass at least one. */
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  /** Keyframe name from marketing.module.css (drift1, drift2, ...) */
  animationName: "drift1" | "drift2";
  /** e.g. "28s" */
  duration: string;
}

const COLOR_HSL: Record<OrbColor, string> = {
  violet: "258 90% 60%",
  azure: "215 95% 50%",
};

export function DriftOrb({
  size,
  color,
  opacity,
  top,
  right,
  bottom,
  left,
  animationName,
  duration,
}: DriftOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={styles.driftOrb}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top,
        right,
        bottom,
        left,
        opacity,
        background: `radial-gradient(closest-side, hsl(${COLOR_HSL[color]}), transparent 70%)`,
        animation: `${styles[animationName]} ${duration} ease-in-out infinite`,
      }}
    />
  );
}
