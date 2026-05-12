import type { ApplicationPreview } from "./application-data";
import styles from "../marketing.module.css";

const STATUS_DOT_CLASS: Record<ApplicationPreview["status"], string | undefined> = {
  wishlist: styles.statusDotWishlist,
  applied: styles.statusDotApplied,
  phone: styles.statusDotPhone,
  onsite: styles.statusDotOnsite,
  offer: styles.statusDotOffer,
};

export function ApplicationCardPreview({ app }: { app: ApplicationPreview }) {
  return (
    <div className={`${styles.appCard} ${app.recent ? styles.appCardRecent : ""}`}>
      <div className={styles.appCardTop}>
        <div
          className={styles.appAvatar}
          style={{ background: app.avatarGradient, color: app.avatarTextColor ?? "#fff" }}
          aria-hidden="true"
        >
          {app.companyInitial}
        </div>
        <div className={styles.appCardCompany}>{app.companyName}</div>
      </div>
      <div className={styles.appCardTitle}>{app.title}</div>
      <div className={styles.appCardBottom}>
        <span>{app.timestamp}</span>
        <span className={`${styles.statusDot} ${STATUS_DOT_CLASS[app.status]}`} aria-hidden="true" />
      </div>
    </div>
  );
}
