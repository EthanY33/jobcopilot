import Link from "next/link";
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function FinalCTASection() {
  return (
    <section className={styles.finalCtaSection} aria-labelledby="cta-heading">
      <DriftOrb size={520} color="azure" opacity={0.16} bottom="-200px" left="50%" animationName="drift2" duration="30s" />

      <ScrollReveal>
        <h2 id="cta-heading" className={styles.finalCtaH2}>
          Ready to <span className={styles.h2Gradient}>stop writing applications?</span>
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={120}>
        <p className={styles.finalCtaSub}>
          Try the demo. Or read the source. Free forever, runs on your Anthropic key, no marketing email.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={240}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-brand)] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[hsl(var(--brand-violet)/.4)] transition-opacity hover:opacity-90"
          >
            Try the demo →
          </Link>
          <a
            href="https://github.com/EthanY33/jobcopilot"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-[#25252e] bg-transparent px-6 py-3 text-sm font-semibold text-[#f4f4f8] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            ★ Star on GitHub
          </a>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={360}>
        <div className={styles.finalFineprint}>Open source · MIT · v1.0</div>
      </ScrollReveal>
    </section>
  );
}
