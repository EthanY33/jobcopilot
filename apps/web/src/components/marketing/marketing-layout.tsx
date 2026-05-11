import type { ReactNode } from "react";
import { UtilityBar } from "./utility-bar";
import styles from "./marketing.module.css";

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <main className={styles.marketingMain}>
      <UtilityBar />
      {children}
    </main>
  );
}
