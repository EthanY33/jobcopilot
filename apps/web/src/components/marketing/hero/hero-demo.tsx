"use client";

import { LayoutGrid, Trello, Copy, User } from "lucide-react";
import styles from "../marketing.module.css";

const TAB_LABELS = ["Overview", "Cover Letter", "Resume", "Answers", "Timeline"] as const;
const ACTIVE_TAB_INDEX = 1; // Cover Letter is the initial active tab

const COVER_LETTER = (
  <p>
    Dear YouTube Creator Partnerships team, I&apos;d love to join the team building tools for creators. The
    work you&apos;re doing is exactly the kind of thing I&apos;ve been focused on for the past year. I think
    I&apos;d bring real momentum on day one
    <span className={styles.cursor} aria-hidden="true" />
  </p>
);

export function HeroDemo() {
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

            <div className={styles.tabsRow} role="tablist">
              {TAB_LABELS.map((label, i) => (
                <div
                  key={label}
                  role="tab"
                  aria-selected={i === ACTIVE_TAB_INDEX}
                  className={`${styles.tab} ${i === ACTIVE_TAB_INDEX ? styles.tabActive : ""}`}
                >
                  {label}
                </div>
              ))}
              {/* Tab indicator: width/left set by the cycle in Task 7. Static
                  placeholder for now points at Cover Letter (index 1). */}
              <div className={styles.tabIndicator} style={{ left: "94px", width: "112px" }} />
            </div>

            <div className={styles.aiPane}>{COVER_LETTER}</div>

            <div className={styles.statusRow}>
              <span className={styles.statusLive}>LIVE</span>
              <span>DRAFTING COVER LETTER</span>
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
