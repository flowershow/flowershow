import dynamic from "next/dynamic";
import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import SocialProof from "./_components/social-proof";
import Features from "./_components/features";
import Solutions from "./_components/solutions";
import Contact from "./_components/contact";
import Pricing from "./_components/pricing";
import Addons from "./_components/addons";

const DatopianGlobe = dynamic(() => import("./_components/globe/globe"), {
  ssr: false,
});

const heroTitle = (
  <>
    Managed Data Portal in the Cloud
    {/* <span className="text-cyan-500"></span> */}
  </>
);

const heroDescription = `PortalJS Cloud is the simplest way of getting started with Open Data
for governments, non-profits, academics and companies of all sizes.`;

const heroActions = [
  {
    label: "Get started",
    href: "https://cloud.portaljs.com/auth/signup",
    variant: "solid" as const,
    target: "_blank" as const,
  },
  {
    label: "Book a demo",
    href: "https://calendar.app.google/Q1hJbGkEvBNbvk5z5",
    variant: "outline" as const,
    target: "_blank" as const,
  },
];

const heroVisual = () => (
  <div className="-my-24 -mr-30 hidden lg:block">
    <DatopianGlobe />
  </div>
);

const heroAnnouncement = {
  content: "🔥 PortalJS Cloud (beta) is now available ➡️",
  href: "https://cloud.portaljs.com/auth/signup",
};

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero
          title={heroTitle}
          description={heroDescription}
          announcement={heroAnnouncement}
          actions={heroActions}
          Visual={heroVisual}
        />

        <Section className="mx-auto max-w-6xl">
          <SocialProof />
        </Section>

        <Section className="mx-auto max-w-6xl">
          <Features />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Solutions />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Contact />
        </Section>

        <Section className="mx-auto max-w-6xl">
          <Pricing />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Addons />
        </Section>
      </div>
    </>
  );
}
