import Hero from "components/toolkit/Hero.jsx";
import SocialProof from "@/components/toolkit/SocialProof.jsx";
import Features from "@/components/toolkit/Features.jsx";
import Solutions from "@/components/toolkit/Solutions.jsx";
import Contact from "components/opendata/Contact.jsx";
import { NextSeo } from "next-seo";

export default function Enterprise() {
  return (
    <>
      <NextSeo
        title="DataHub Toolkit - Open Platform for Open Data Portals, Data Catalogs and Data Lakes"
        openGraph={{
          images: [
            {
              url: "https://datahub.io/static/img/opendata/dms.png",
              alt: "DataHub - a complete solution for Open Data Platforms, Data Catalogs, Data Lakes and Data Management.",
              width: 1200,
              height: 627,
              type: "image/jpg",
            },
          ],
        }}
      />
      <Hero />
      <SocialProof />
      <Features />
      <Solutions />
      <Contact />
    </>
  );
}
