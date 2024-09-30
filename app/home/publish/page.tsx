import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Heart } from "lucide-react";

import { Section } from "@/components/section";
import { Hero } from "@/components/hero";
import { CTASection } from "@/components/CTA-section";
import { QuickStart } from "./_components/QuickStart";
import { VisualDemo } from "./_components/VisualDemo";
import { Features } from "./_components/Features";
import { Showcase } from "./_components/Showcase";
import { FAQ } from "./_components/FAQ";

import { env } from "@/env.mjs";

const heroFeatures = [
  "Easy to use",
  "Markdown-based",
  "Hosted for you",
  "Run-off GitHub",
];

const heroTitle = <>Publish your markdown notes directly from Github</>;

const heroHref: string = (() => {
  let url = "";
  if (env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    url = `https://staging-cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
  } else {
    url = `http://cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
  }
  return url;
})();

const heroActions = [
  {
    label: "Get started for free",
    href: heroHref,
    variant: "solid" as const,
  },
];

const heroDescription =
  "Turn your Github repositories into dynamic data-rich sites with a few clicks. No coding.";

const CTAhref: string = (() => {
  let url = "";
  if (env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    url = `https://staging-cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
  } else {
    url = `http://cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
  }
  return url;
})();

export default function Home() {
  return (
    <>
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

      <Section>
        <Features />
      </Section>

      <Section>
        <Showcase />
      </Section>

      <Section>
        <FAQ />
      </Section>

      <Section>
        <CTASection
          title="Get Started for Free"
          description="Join our Beta community and shape the future of DataHub Cloud with your feedback."
          linkText="Get started for free"
          linkUrl={CTAhref}
          filled
        />
      </Section>
    </>
  );
}

function HeroMessage() {
  return (
    <div className="text-center">
      <p className="mt-2 text-base font-light text-gray-500">
        No credit card required
      </p>

      <p className="mt-10 flex items-center justify-center text-lg font-bold">
        Built with{" "}
        <Heart className="mx-2 fill-orange-400 text-orange-400" size={24} /> by
        Datopian
      </p>
    </div>
  );
}
