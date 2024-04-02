import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import FeaturesTiles from "@/components/features-tiles";
import Image from "next/image";
import Showcases from "@/components/showcases";
import Community from "@/components/community";

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
    variant: "outline" as const,
  },
  {
    label: "PortalJS Cloud",
    href: "#",
    variant: "solid" as const,
  },
];

const features: { title: string; description: string; icon: string }[] = [
  {
    title: "Unified sites",
    description:
      "Present data and content in one seamless site, pulling datasets from a DMS (e.g. CKAN) and content from a CMS (e.g. wordpress) with a common internal API",
    icon: "/icon-unified-sites.svg",
  },
  {
    title: "Developer friendly",
    description: "Built with familiar frontend tech Javascript, React etc",
    icon: "/icon-dev-friendly.svg",
  },
  {
    title: "Batteries included",
    description:
      "Full set of portal components out of the box e.g. catalog search, dataset showcase, blog etc.",
    icon: "/icon-batteries-included.svg",
  },
  {
    title: "Easy to theme and customize",
    description:
      "installable themes, use standard CSS and React+CSS tooling. Add new routes quickly.",
    icon: "/icon-easy-to-theme.svg",
  },
  {
    title: "Extensible",
    description: "quickly extend and develop/import your own React components",
    icon: "/icon-extensible.svg",
  },
  {
    title: "Well documented",
    description:
      "full set of documentation plus the documentation of NextJS and Apollo.",
    icon: "/icon-well-documented.svg",
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
      <div className="mx-auto max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero
          title={heroTitle}
          description={heroDescription}
          Visual={heroVisual}
          actions={heroActions}
        />

        <Section className="mx-auto max-w-4xl">
          <FeaturesTiles features={features} />
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
