import Image from "next/image";
import { Section } from "@/components/section";
import { Hero } from "@/components/hero";

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
        target: "_blank" as const
    },
    {
        label: "Book a demo",
        href: "https://calendar.app.google/Q1hJbGkEvBNbvk5z5",
        variant: "outline" as const,
        target: "_blank" as const
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
                    {/* <Community /> */}
                </Section>
            </div>
        </>
    );
}
