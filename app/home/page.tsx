import { Section } from "@/components/data-rich/Section";
import { Hero } from "@/components/data-rich/Hero";
import { LivePreview } from "@/components/data-rich/LivePreview";
import { Features } from "@/components/data-rich/Features";
/* import { Roadmap } from "@/components/home/Roadmap"; */
import { CTASection } from "@/components/data-rich/CTASection";
import { QuickStart } from "@/components/data-rich/QuickStart";
import { About } from "@/components/data-rich/About";

export default function Home() {
  return (
    <>
      <div className="max-w-8xl mx-auto px-4 pt-8 md:px-8 lg:px-[8rem] ">
        <Hero />

        <Section className="mt-6 md:mt-8">
          <LivePreview />
        </Section>

        <Section>
          <About />
        </Section>

        <Section>
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
