"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { LayoutGrid, Trello, Copy, User } from "lucide-react";
import styles from "../marketing.module.css";

const TAB_LABELS = ["Overview", "Cover Letter", "Resume", "Answers", "Timeline"] as const;
// Cycle order is Cover Letter → Resume → Answers (indices 1 → 2 → 3).
const CYCLE_INDICES = [1, 2, 3] as const;
const STATUS_LABELS: Record<number, string> = {
  1: "DRAFTING COVER LETTER",
  2: "TAILORING RESUME BULLETS",
  3: "ANSWERING FREE TEXT QUESTIONS",
};

export function HeroDemo() {
  const [activeIdx, setActiveIdx] = useState<number>(1);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    let cycleStep = 0;
    const id = setInterval(() => {
      cycleStep = (cycleStep + 1) % CYCLE_INDICES.length;
      setActiveIdx(CYCLE_INDICES[cycleStep]);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const el = tabRefs.current[activeIdx];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeIdx]);

  return (
    <div className={styles.frameStage}>
      <div className={styles.heroFrame}>
        <div className={styles.frameChrome}>
          <span className={`${styles.dot} ${styles.dotR}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dotY}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dotG}`} aria-hidden="true" />
          <div className={styles.urlBar}>jobcopilot.app/applications/3a904ba7</div>
        </div>

        <div className={styles.frameBody}>
          <nav className={styles.sidebar} aria-label="Demo sidebar">
            <div className={styles.sidebarSection}>Workspace</div>
            <SidebarRow icon={<LayoutGrid size={14} />} label="Dashboard" />
            <SidebarRow icon={<Trello size={14} />} label="Tracker" active />
            <SidebarRow icon={<Copy size={14} />} label="Resume Variants" />
            <SidebarRow icon={<User size={14} />} label="Profile" />
          </nav>

          <div className={styles.heroMain}>
            <div className={styles.metaLine}>GOOGLE · APPLICATIONS ENGINEER</div>
            <h3 className={styles.appTitle}>Applications Engineer, YouTube Creator Partnerships</h3>

            <div className={styles.tabsRow}>
              {TAB_LABELS.map((label, i) => (
                <div
                  key={label}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  className={`${styles.tab} ${i === activeIdx ? styles.tabActive : ""}`}
                >
                  {label}
                </div>
              ))}
              <div
                className={styles.tabIndicator}
                style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
              />
            </div>

            <div className={styles.aiPane}>
              <PaneContent activeIdx={activeIdx} />
            </div>

            <div className={styles.statusRow}>
              <span className={styles.statusLive}>LIVE</span>
              <span>{STATUS_LABELS[activeIdx]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`${styles.sidebarRow} ${active ? styles.sidebarActive : ""}`} aria-current={active ? "page" : undefined}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function PaneContent({ activeIdx }: { activeIdx: number }) {
  if (activeIdx === 1) {
    return (
      <p>
        Dear YouTube Creator Partnerships team, I&apos;d love to join the team building tools for creators.
        The work you&apos;re doing is exactly the kind of thing I&apos;ve been focused on for the past year. I
        think I&apos;d bring real momentum on day one
        <span className={styles.cursor} aria-hidden="true" />
      </p>
    );
  }
  if (activeIdx === 2) {
    return (
      <>
        <div className={styles.paneLabel}>Resume bullets · tailored to posting</div>
        <ul className={styles.bulletList}>
          <li className={styles.bulletItem}>
            Built and shipped JobCopilot, an open source tool that uses Claude to draft job applications end to end.
          </li>
          <li className={styles.bulletItem}>
            Designed a resume variant system. One source of truth, multiple tailored versions per posting.
          </li>
          <li className={styles.bulletItem}>
            Deployed on Vercel and Supabase free tiers. Under $5 a month, full accessibility.
            <span className={styles.cursor} aria-hidden="true" />
          </li>
        </ul>
      </>
    );
  }
  if (activeIdx === 3) {
    return (
      <>
        <div className={styles.qaPair}>
          <div className={styles.qaQ}>Q · Why are you interested in this role?</div>
          <p>
            Creator tooling is one of the most leveraged places to apply AI right now. You ship into a real
            audience that benefits from every percent of friction removed, and I want to work on that surface.
          </p>
        </div>
        <div className={styles.qaPair}>
          <div className={styles.qaQ}>Q · Tell us about a relevant project.</div>
          <p>
            JobCopilot. An open source app that drafts every piece of a job application using Claude. Running on
            free tiers. Source on GitHub
            <span className={styles.cursor} aria-hidden="true" />
          </p>
        </div>
      </>
    );
  }
  // Overview / Timeline aren't in the cycle — show nothing during transitions.
  return null;
}
