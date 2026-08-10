import { NavBar } from "@/components/shared/NavBar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/landing/Hero";
import { IdeaSection } from "@/components/landing/IdeaSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StackBuilder } from "@/components/landing/StackBuilder";
import { ChatSection } from "@/components/landing/ChatSection";
import { PricingBand } from "@/components/landing/PricingBand";
import { ExploreBand } from "@/components/landing/ExploreBand";
import { Quickstart } from "@/components/landing/Quickstart";
import styles from "@/styles/section.module.css";

export default function LandingPage() {
  return (
    <div className={styles.shell}>
      <NavBar />
      <Hero />
      <IdeaSection />
      <HowItWorks />
      <StackBuilder />
      <ChatSection />
      <PricingBand />
      <ExploreBand />
      <Quickstart />
      <Footer />
    </div>
  );
}
