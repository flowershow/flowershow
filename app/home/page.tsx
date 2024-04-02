import Image from "next/image";
import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import { Features } from "./_components/Features";
import { CTASection } from "./_components/CTASection";
import { QuickStart } from "./_components/QuickStart";
import { About } from "./_components/About";

const heroFeatures = [
  "Easy to use",
  "Markdown-based",
  "Hosted for you",
  "Run-off GitHub",
  "Open source",
];

const heroTitle = (
  <>
    Build elegant data-driven sites with markdown &{" "}
    <span className="text-orange-400">deploy in seconds.</span>
  </>
);

const heroActions = [
  {
    label: "Join the waitlist",
    href: "https://tally.so/r/wad1O2",
    target: "_blank" as const,
    variant: "solid" as const,
  },
  /* {
   *     label: "View on GitHub",
   *     href: "/",
   *     variant: "outline",
   * }, */
];

const heroVisual = () => (
  <div className="relative">
    <Image
      src="/Readme.png"
      alt=""
      className="relative -top-8 w-3/4 rounded-lg shadow-xl"
      width={490}
      height={540}
      unoptimized
    />
    <Image
      src="/my-datarich-blog.png"
      alt=""
      className="absolute left-1/3 top-12 w-3/4 rounded-lg shadow-2xl"
      width={490}
      height={540}
      unoptimized
    />
  </div>
);

const heroDescription =
  "Publish datasets, data stories and data portals using markdown with a few clicks.";

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero
          title={heroTitle}
          description={heroDescription}
          Visual={heroVisual}
          features={heroFeatures}
          actions={heroActions}
        />

        <Section className="mx-auto max-w-4xl">
          <About />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Features />
        </Section>

        <Section>
          <QuickStart />
        </Section>
      </div>

      <Section className="w-full">
        <CTASection />
      </Section>

      {/* <Section className="!max-w-3xl">
                <Roadmap />
            </Section>
 */}
    </>
  );
}
