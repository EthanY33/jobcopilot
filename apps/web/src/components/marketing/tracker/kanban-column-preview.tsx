import type { ReactNode } from "react";
import type { ApplicationStatus } from "./application-data";
import styles from "../marketing.module.css";

const STATUS_TO_CLASS: Record<ApplicationStatus, string | undefined> = {
  wishlist: styles.kanbanColWishlist,
  applied: styles.kanbanColApplied,
  phone: styles.kanbanColPhone,
  onsite: styles.kanbanColOnsite,
  offer: styles.kanbanColOffer,
};

interface KanbanColumnPreviewProps {
  status: ApplicationStatus;
  label: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumnPreview({ status, label, count, children }: KanbanColumnPreviewProps) {
  return (
    <div className={`${styles.kanbanCol} ${STATUS_TO_CLASS[status]}`}>
      <div className={styles.kanbanColHead}>
        <span>{label}</span>
        <span className={styles.kanbanColCount}>{count}</span>
      </div>
      <div className={styles.kanbanColBody}>{children}</div>
    </div>
  );
}
