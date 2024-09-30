import { Metadata } from "next";
import Image from "next/image";

import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import { Showcases } from "./_components/showcases";
import { Community } from "./_components/community";
import { Features } from "./_components/features";
import { env } from "@/env.mjs";

export const metadata: Metadata = {
  title: "The JavaScript framework for data portals.",
  description:
    "Rapidly build rich data portals using a modern frontend framework.",
  icons: ["/favicon.ico"],
  openGraph: {
    title: "The JavaScript framework for data portals.",
    description:
      "Rapidly build rich data portals using a modern frontend framework.",
    type: "website",
    url: `${env.NEXT_PUBLIC_ROOT_DOMAIN}/opensource`,
    images: [
      {
        url: "/opensource.png",
        width: 1200,
        height: 627,
        alt: "",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The JavaScript framework for data portals.",
    description:
      "Rapidly build rich data portals using a modern frontend framework.",
    images: [
      {
        url: "/opensource.png",
        width: 800,
        height: 418,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
  },
};

const heroTitle = (
  <>
    The JavaScript framework for{" "}
    <span className="text-cyan-500">data portals.</span>
  </>
);

const heroDescription =
  "Rapidly build rich data portals using a modern frontend framework.";

const heroActions = [
  {
    label: "Get started",
    href: "/docs",
    variant: "solid" as const,
  },
  {
    label: "Try DataHub Portal",
    href: "/portal",
    variant: "outline" as const,
  },
];

const heroVisual = () => (
  <Image
    src="/datahub.webp"
    alt="opendata.datahub.io"
    className="w-full rounded-lg shadow-xl lg:-mr-24"
    width={490}
    height={540}
    unoptimized
  />
);

export default function Home() {
  return (
    <>
      <Hero
        title={heroTitle}
        description={heroDescription}
        Visual={heroVisual}
        actions={heroActions}
      />

      <Section>
        <Features />
      </Section>

      <Section>
        <Showcases />
      </Section>

      <Section>
        <Community />
      </Section>
    </>
  );
}
