import Hero from "components/opendata/Hero.jsx";
import Features from "components/opendata/Features.jsx";
import HowItWorks from "components/opendata/HowItWorks.jsx";
import MoreFeatures from "components/opendata/MoreFeatures.jsx";
import Faq from "components/opendata/Faq.jsx";
import Contact from "components/opendata/Contact.jsx";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <MoreFeatures />
      <Faq />
      <Contact />
    </main>
  );
}
