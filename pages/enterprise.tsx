import Hero from "components/enterprise/Hero.jsx";
import SocialProof from "components/enterprise/SocialProof.jsx";
import Features from "components/enterprise/Features.jsx";
import Solutions from "components/enterprise/Solutions.jsx";
import Contact from "components/opendata/Contact.jsx";
import { NextSeo } from "next-seo";

export default function Enterprise() {
  return (
    <>
      <NextSeo title="Home" />
      <Hero />
      <SocialProof />
      <Features />
      <Solutions />
      <Contact />
    </>
  );
}
