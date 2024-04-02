import { Hero } from "@/components/hero";
import Image from "next/image";

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
      </div>
    </>
  );
}
