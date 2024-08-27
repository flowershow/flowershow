import Image from "next/image";
import Showcases from "./_components/showcases";
import Community from "./_components/community";
import Features from "./_components/features";
import { Section } from "@/components/section";
import { Metadata } from "next";
import { Hero } from "@/components/hero";
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
  /* {
   *     label: "DataHub Cloud",
   *     href: "#",
   *     variant: "solid" as const,
   * }, */
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
      <div className="mx-auto max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero
          title={heroTitle}
          description={heroDescription}
          Visual={heroVisual}
          actions={heroActions}
        />

        <Section className="mx-auto max-w-4xl">
          <Features />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Showcases />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Community />
        </Section>
      </div>
    </>
  );
}
