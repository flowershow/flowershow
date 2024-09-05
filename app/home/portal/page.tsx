import dynamic from "next/dynamic";
import { Metadata } from "next";
import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import SocialProof from "./_components/social-proof";
import Features from "./_components/features";
import Solutions from "./_components/solutions";
import Contact from "./_components/contact";
import Pricing from "./_components/pricing";
import Addons from "./_components/addons";
import { env } from "@/env.mjs";

export const metadata: Metadata = {
  title: "Fully Managed Data Portal in the Cloud",
  description:
    "DataHub Portal  is the simplest way to create data portals and data catalogs. For governments, non-profits, researchers and companies of all sizes.",
  icons: ["/favicon.ico"],
  openGraph: {
    title: "Fully Managed Data Portal in the Cloud",
    description:
      "DataHub Portal is the simplest way to create data portals and data catalogs. For governments, non-profits, researchers and companies of all sizes.",
    type: "website",
    url: `${env.NEXT_PUBLIC_ROOT_DOMAIN}/portal`,
    images: [
      {
        url: "/portal.png",
        width: 1200,
        height: 627,
        alt: "",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fully Managed Data Portal in the Cloud",
    description:
      "DataHub Portal is the simplest way to create data portals and data catalogs. For governments, non-profits, researchers and companies of all sizes.",
    images: [
      {
        url: "portal.png",
        width: 800,
        height: 418,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
  },
};

const DatopianGlobe = dynamic(() => import("./_components/globe/globe"), {
  ssr: false,
});

const heroTitle = (
  <>
    Fully Managed
    <br />
    Data Portal
    <br />
    in the Cloud
    {/* <span className="text-cyan-500"></span> */}
  </>
);

const heroDescription = `DataHub Portal is the simplest way to create data portals and data catalogs. For governments, non-profits, researchers and companies of all sizes.`;

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
  content: "🔥 DataHub Portal (beta) is now available ➡️",
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
