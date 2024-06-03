import { Section } from "@/components/section";
import { CTASection } from "@/app/home/_components/CTASection";
import { QuickStart } from "@/app/home/_components/QuickStart";
import { Hero } from "@/components/hero";
import FAQ from "@/app/home/_components/FAQ";
import TestimonialSection from "@/app/home/_components/Testimonials";
import { VisualDemo } from "@/app/home/_components/VisualDemo";
import Showcase from "@/app/home/_components/Showcase";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Features } from "./_components/Features";
import { Heart } from "lucide-react";

const heroFeatures = [
  "Easy to use",
  "Markdown-based",
  "Hosted for you",
  "Run-off GitHub",
];

const heroTitle = <>Publish your datasets directly from Github</>;

const heroActions = [
  {
    label: "Get started for free",
    href: "",
    target: "_blank" as const,
    variant: "solid" as const,
  },
];

const heroDescription =
  "Turn your Github repositories into dynamic data-rich sites with a few clicks. No coding.";

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero
          title={heroTitle}
          description={heroDescription}
          features={heroFeatures}
          actions={heroActions}
        >
          <HeroMessage />
        </Hero>

        <Section>
          <VisualDemo />
        </Section>

        <Section>
          <QuickStart />
        </Section>

        <Section className="mx-auto max-w-4xl">
          <Features />
        </Section>

        <Section>
          <Showcase />
        </Section>

        <Section>
          <TestimonialSection />
        </Section>

        <Section>
          <FAQ />
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

function HeroMessage() {
  return (
    <div className="text-center">
      <p className="mt-2 text-base font-light text-gray-500">
        No credit card required
      </p>

      <p className="mt-4 flex items-center justify-center text-lg font-bold">
        Built with{" "}
        <Heart className="mx-2 fill-orange-400 text-orange-400" size={24} /> by
        Datopian
      </p>
    </div>
  );
}
