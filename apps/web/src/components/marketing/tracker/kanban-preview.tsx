import { APPLICATIONS, type ApplicationStatus } from "./application-data";
import { ApplicationCardPreview } from "./application-card-preview";
import { KanbanColumnPreview } from "./kanban-column-preview";
import styles from "../marketing.module.css";

const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: "wishlist", label: "Wishlist" },
  { status: "applied", label: "Applied" },
  { status: "phone", label: "Phone screen" },
  { status: "onsite", label: "Onsite" },
  { status: "offer", label: "Offer" },
];

export function KanbanPreview() {
  return (
    <div className={styles.kanbanFrame}>
      <div className={styles.frameChrome}>
        <span className={`${styles.dot} ${styles.dotR}`} aria-hidden="true" />
        <span className={`${styles.dot} ${styles.dotY}`} aria-hidden="true" />
        <span className={`${styles.dot} ${styles.dotG}`} aria-hidden="true" />
        <div className={styles.urlBar}>jobcopilot.app/tracker</div>
      </div>
      <div className={styles.kanbanGrid}>
        {COLUMNS.map((col) => {
          const cards = APPLICATIONS.filter((a) => a.status === col.status);
          return (
            <KanbanColumnPreview key={col.status} status={col.status} label={col.label} count={cards.length}>
              {cards.map((app) => (
                <ApplicationCardPreview key={app.id} app={app} />
              ))}
            </KanbanColumnPreview>
          );
        })}
      </div>
    </div>
  );
}
