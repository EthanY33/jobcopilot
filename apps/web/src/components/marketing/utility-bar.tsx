import styles from "./marketing.module.css";

export function UtilityBar() {
  return (
    <div className={styles.utilityBar}>
      <span>JOBCOPILOT · v1.0</span>
      <a
        href="https://github.com/EthanY33/jobcopilot"
        target="_blank"
        rel="noreferrer noopener"
      >
        github · ethany33/jobcopilot
      </a>
    </div>
  );
}
