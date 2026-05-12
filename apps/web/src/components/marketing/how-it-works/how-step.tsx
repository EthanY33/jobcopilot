import type { ReactNode } from "react";
import styles from "../marketing.module.css";

interface HowStepProps {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  visual: ReactNode;
}

export function HowStep({ number, title, description, visual }: HowStepProps) {
  return (
    <div className={styles.howStep}>
      <div className={styles.howNumber} aria-hidden="true">
        {String(number).padStart(2, "0")}
      </div>
      <h3 className={styles.howStepTitle}>{title}</h3>
      <p className={styles.howStepDesc}>{description}</p>
      <div>{visual}</div>
    </div>
  );
}
