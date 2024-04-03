import dynamic from "next/dynamic";
import { Section } from "@/components/section";
import { Hero } from "@/components/hero";

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
  <div className="hidden lg:block">
    <DatopianGlobe />
  </div>
);

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero
          title={heroTitle}
          description={heroDescription}
          actions={heroActions}
          Visual={heroVisual}
        />

        <Section className="mx-auto max-w-4xl">{/* <Community /> */}</Section>
      </div>
    </>
  );
}
