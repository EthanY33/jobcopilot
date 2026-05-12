import { HowStep } from "./how-step";
import { PasteVisual } from "./paste-visual";
import { DraftVisual } from "./draft-visual";
import { ShipVisual } from "./ship-visual";
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function HowItWorksSection() {
  return (
    <section className={styles.howSection} aria-labelledby="how-heading">
      <DriftOrb size={560} color="azure" opacity={0.22} top="-280px" left="35%" animationName="drift1" duration="32s" />
      <DriftOrb size={460} color="violet" opacity={0.22} top="18%" left="-160px" animationName="drift2" duration="26s" />
      <DriftOrb size={420} color="azure" opacity={0.18} bottom="-120px" right="-140px" animationName="drift1" duration="24s" />

      <ScrollReveal>
        <div className={styles.howHeading}>
          <h2 id="how-heading" className={styles.h2}>
            Three steps. <span className={styles.h2Gradient}>No resume tinkering.</span>
          </h2>
          <p className={styles.sectionSub}>
            JobCopilot reads the posting, drafts every piece against your resume, then tracks the outcome. You
            stay in the loop. You just stop writing the boring parts.
          </p>
        </div>
      </ScrollReveal>

      <div className={styles.howGrid}>
        <div className={styles.howConnector} aria-hidden="true" />
        <ScrollReveal>
          <HowStep
            number={1}
            title="Paste the posting."
            description="Drop in a Greenhouse, Lever, or Workday URL. JobCopilot extracts the role, requirements, and tone."
            visual={<PasteVisual />}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={150}>
          <HowStep
            number={2}
            title="Draft against your resume."
            description="Claude writes the cover letter, picks resume bullets, and answers free text questions in your voice."
            visual={<DraftVisual />}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={300}>
          <HowStep
            number={3}
            title="Ship and track."
            description="Move cards across your pipeline. Stay on top of follow-ups. Every application stays drafted, edited, and submitted from one place."
            visual={<ShipVisual />}
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
