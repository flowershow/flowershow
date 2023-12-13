import { Section } from "@/components/home/Section";
import { Hero } from "@/components/home/Hero";
import { LivePreview } from "@/components/home/LivePreview";
import { Features } from "@/components/home/Features";
/* import { Vision } from "@/components/home/Vision"; */
/* import { Roadmap } from "@/components/home/Roadmap"; */
import { CTASection } from "@/components/home/CTASection";
import { QuickStart } from "@/components/home/QuickStart";

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

            {/* <Section className="lg:!max-w-3xl">
                <Vision />
            </Section> */}

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
