import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function ManifestoSection() {
  return (
    <section className={styles.manifestoSection} aria-labelledby="manifesto-heading">
      <DriftOrb size={540} color="violet" opacity={0.2} top="-260px" left="18%" animationName="drift1" duration="30s" />
      <DriftOrb size={420} color="azure" opacity={0.15} bottom="10%" right="-160px" animationName="drift2" duration="28s" />

      <ScrollReveal>
        <h2 id="manifesto-heading" className={styles.manifestoH2}>
          <span>I built this </span>
          <span className={styles.h2Gradient}>for myself.</span>
        </h2>
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.manifestoBody}>
          <p className={styles.manifestoP}>
            Job applications take hours. Most of that time goes to writing cover letters and tweaking resume
            bullets for postings I&apos;d already read three times. I wanted that work done. Cleanly, with my
            voice, against my real resume.
          </p>
          <p className={styles.manifestoP}>
            So I built JobCopilot. It reads the posting, drafts every piece against my profile, and tracks the
            outcome.{" "}
            <span className={styles.manifestoHighlight}>Claude does the writing. I review and ship.</span>
          </p>
          <p className={styles.manifestoP}>
            The whole thing runs on free tiers. The source is on GitHub. If you want it, fork it.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={150}>
        <div className={styles.specsStrip}>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>Stack</span>
            <span className={styles.specValue}>Next.js + Claude</span>
          </div>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>Cost</span>
            <span className={`${styles.specValue} ${styles.specValueGradient}`}>Under $5/mo</span>
          </div>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>License</span>
            <span className={styles.specValue}>MIT</span>
          </div>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>Status</span>
            <span className={styles.specValue}>Personal use</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={300}>
        <div className={styles.byline}>
          <div className={styles.bylineAvatar} aria-hidden="true">E</div>
          <div>
            <div className={styles.bylineName}>Ethan Yucetepe</div>
            <div className={styles.bylineHandle}>@EthanY33 · github.com/EthanY33/jobcopilot</div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
