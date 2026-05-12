import { MarketingLayout } from "./marketing-layout";
import { HeroSection } from "./hero/hero-section";
import { HowItWorksSection } from "./how-it-works/how-it-works-section";
import { TrackerPipelineSection } from "./tracker/tracker-pipeline-section";
import { ManifestoSection } from "./manifesto/manifesto-section";
import { FinalCTASection } from "./final-cta/final-cta-section";
import { MarketingFooter } from "./footer/marketing-footer";

export function MarketingPage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <HowItWorksSection />
      <TrackerPipelineSection />
      <ManifestoSection />
      <FinalCTASection />
      <MarketingFooter />
    </MarketingLayout>
  );
}
