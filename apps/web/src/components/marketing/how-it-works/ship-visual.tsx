import styles from "../marketing.module.css";

export function ShipVisual() {
  return (
    <div className={styles.shipFrame} aria-hidden="true">
      <div className={styles.shipCol}>
        <div className={styles.shipColLabel}>Wishlist</div>
        <div className={styles.shipCard}>Anthropic</div>
      </div>
      <div className={styles.shipCol}>
        <div className={styles.shipColLabel}>Drafting</div>
        <div className={`${styles.shipCard} ${styles.shipCardDrafting}`}>Google</div>
      </div>
      <div className={styles.shipCol}>
        <div className={styles.shipColLabel}>Applied</div>
        <div className={`${styles.shipCard} ${styles.shipCardApplied}`}>Google</div>
      </div>
    </div>
  );
}
