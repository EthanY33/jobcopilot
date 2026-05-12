import { KanbanPreview } from "./kanban-preview";
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function TrackerPipelineSection() {
  return (
    <section className={styles.trackerSection} aria-labelledby="tracker-heading">
      <DriftOrb size={520} color="violet" opacity={0.2} top="8%" right="-180px" animationName="drift1" duration="30s" />
      <DriftOrb size={480} color="azure" opacity={0.18} bottom="10%" left="-160px" animationName="drift2" duration="26s" />

      <ScrollReveal>
        <div className={styles.trackerHeading}>
          <h2 id="tracker-heading" className={styles.h2}>
            Every application, <span className={styles.h2Gradient}>in one view.</span>
          </h2>
          <p className={styles.sectionSub}>
            Drag cards to update status. Click any card to jump back to the drafts. Wishlist, applied, screens,
            offers. All in one place.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.statsStrip}>
          <div className={styles.statBlock}>
            <span className={styles.statNumber}>23</span>
            <span className={styles.statLabel}>Applications</span>
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statNumber}>6</span>
            <span className={styles.statLabel}>Phone screens</span>
          </div>
          <div className={styles.statBlock}>
            <span className={`${styles.statNumber} ${styles.statNumberGradient}`}>2</span>
            <span className={styles.statLabel}>Offers</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={150}>
        <KanbanPreview />
      </ScrollReveal>
    </section>
  );
}
