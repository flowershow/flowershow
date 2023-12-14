import { Section } from "@/components/data-rich/Section";
import { Hero } from "@/components/data-rich/Hero";
import { LivePreview } from "@/components/data-rich/LivePreview";
import { Features } from "@/components/data-rich/Features";
/* import { Roadmap } from "@/components/home/Roadmap"; */
import { CTASection } from "@/components/data-rich/CTASection";
import { QuickStart } from "@/components/data-rich/QuickStart";

export default function Home() {


    return (
        <>
            <Hero />

            <Section className="mt-6 md:mt-8">
                <LivePreview />
            </Section>

            <Section>
                <Features />
            </Section>

            <Section>
                <QuickStart />
            </Section>

            {/* <Section className="!max-w-3xl">
                <Roadmap />
            </Section>
 */}
            <div className="mt-24 md:mt-36">
                <CTASection />
            </div>
        </>
    );
}
