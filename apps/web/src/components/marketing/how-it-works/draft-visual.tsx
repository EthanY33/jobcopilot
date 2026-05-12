import styles from "../marketing.module.css";

export function DraftVisual() {
  return (
    <div className={styles.howVisualFrame} aria-hidden="true">
      <p
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: "13px",
          lineHeight: 1.55,
          color: "#b4b4c4",
          margin: 0,
        }}
      >
        Dear team, the role&apos;s emphasis on AI tooling for creators aligns with
        <span className={styles.cursor} />
      </p>
    </div>
  );
}
