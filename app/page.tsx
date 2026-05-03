import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ForClinicsSection from "@/components/landing/ForClinicsSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "BlogForge — AI Blog Platform for Dental Clinics",
  description:
    "Publish SEO-optimised blog content and auto-share to social media for dental clinics. Human + AI, on autopilot.",
};

export default function Home() {
  return (
    <main style={{ background: "#000", minHeight: "100vh" }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ForClinicsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
