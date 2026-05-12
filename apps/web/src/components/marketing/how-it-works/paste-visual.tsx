import styles from "../marketing.module.css";

export function PasteVisual() {
  return (
    <div className={styles.howVisualFrame} aria-hidden="true">
      <div className={styles.pasteUrl}>boards.greenhouse.io/google/jobs/...</div>
      <div className={styles.pasteCta}>Extract + create →</div>
    </div>
  );
}
