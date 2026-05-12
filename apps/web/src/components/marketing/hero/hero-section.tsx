import Link from "next/link";
import { HeroDemo } from "./hero-demo";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function HeroSection() {
  return (
    <section className={styles.heroSection} aria-labelledby="hero-heading">
      <DriftOrb size={600} color="violet" opacity={0.35} top="-200px" right="-150px" animationName="drift1" duration="28s" />
      <DriftOrb size={500} color="azure" opacity={0.28} bottom="-260px" left="-120px" animationName="drift2" duration="22s" />

      <div className={styles.heroInner}>
        <div className={styles.heroEyebrow}>A personal tool. Open source. Free.</div>

        <h1 id="hero-heading" className={styles.heroH1}>
          <span>Stop writing</span>
          <br />
          <span className={styles.heroH1Gradient}>applications.</span>
        </h1>

        <p className={styles.heroLede}>
          Paste a job posting. AI drafts the <span className={styles.ledePill}>cover letter</span>, tailors
          your <span className={styles.ledePill}>resume bullets</span>, and answers every{" "}
          <span className={styles.ledePill}>free text question</span>. You review, edit, and ship.
        </p>

        <div className={styles.heroCtas}>
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

        <div className={styles.heroFrameWrap}>
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
