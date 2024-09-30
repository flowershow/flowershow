import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Heart } from "lucide-react";

import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import { RequestData } from "./_components/request-data";
import { LogoCloud } from "./_components/logo-cloud";
import { DiscoverSection } from "./_components/discover-section";
import { WeeklyPick } from "./_components/weekly-pick";
import { PublishSection } from "./_components/publish-section";
import { Newsletter } from "./_components/newsletter";

const heroTitle = <>Find, Share and Publish Quality Data with Datahub</>;

const heroActions = [
  {
    label: "Discover datasets",
    href: "/collections",
    variant: "solid" as const,
  },
  {
    label: "Publish your dataset",
    href: "/publish",
    variant: "outline" as const,
  },
];

const heroDescription =
  "With thousands of free datasets and a Premium Data Service, Datahub ensures you always find the data you need, right when you need It – updated, accurate, and tailored to your requirements.";

export default function Home() {
  return (
    <>
      <Hero
        title={heroTitle}
        description={heroDescription}
        actions={heroActions}
      >
        <HeroMessage />
      </Hero>

      <Section>
        <LogoCloud />
      </Section>

      <Section>
        <DiscoverSection />
      </Section>

      <Section>
        <RequestData />
      </Section>

      <Section>
        <WeeklyPick />
      </Section>

      <div className="mt-12 md:mt-16">
        <PublishSection />
      </div>

      <Section>
        <Newsletter />
      </Section>
    </>
  );
}

function HeroMessage() {
  return (
    <div className="text-center">
      <p className="mt-10 flex items-center justify-center text-lg font-bold">
        Built with{" "}
        <Heart className="mx-2 fill-orange-400 text-orange-400" size={24} /> by
        Datopian
      </p>
    </div>
  );
}
