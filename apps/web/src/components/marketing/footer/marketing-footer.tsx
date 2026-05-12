import { Logo } from "@/components/brand/logo";
import { Wordmark } from "@/components/brand/wordmark";
import styles from "../marketing.module.css";

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerBrandLockup}>
            <Logo size={28} />
            <Wordmark size={20} />
          </div>
          <p className={styles.footerTagline}>
            A personal tool that drafts every piece of a job application. Built by Ethan, open-sourced for
            everyone.
          </p>
        </div>

        <div>
          <div className={styles.footerColTitle}>Product</div>
          <div className={styles.footerLinks}>
            <a href="/login">Try the demo</a>
            <a href="#how-heading">How it works</a>
            <a href="#tracker-heading">The pipeline</a>
          </div>
        </div>

        <div>
          <div className={styles.footerColTitle}>Source</div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/EthanY33/jobcopilot" target="_blank" rel="noreferrer noopener">
              GitHub repo
            </a>
            <a href="https://github.com/EthanY33/jobcopilot#readme" target="_blank" rel="noreferrer noopener">
              README
            </a>
            <a
              href="https://github.com/EthanY33/jobcopilot/blob/master/docs/specs/2026-05-07-marketing-landing-design.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              Design spec
            </a>
          </div>
        </div>

        <div>
          <div className={styles.footerColTitle}>Made by</div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/EthanY33" target="_blank" rel="noreferrer noopener">Ethan Yucetepe</a>
            <a href="https://github.com/EthanY33" target="_blank" rel="noreferrer noopener">@EthanY33</a>
            <a href="https://github.com/EthanY33?tab=repositories" target="_blank" rel="noreferrer noopener">
              Other projects
            </a>
          </div>
        </div>
      </div>

      <div className={styles.footerStrip}>
        <span>JOBCOPILOT v1.0 · MIT</span>
        <span>Built with Next.js + Claude</span>
      </div>
    </footer>
  );
}
