import Hero from "components/toolkit/Hero.jsx";
import SocialProof from "@/components/toolkit/SocialProof.jsx";
import Features from "@/components/toolkit/Features.jsx";
import Solutions from "@/components/toolkit/Solutions.jsx";
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
