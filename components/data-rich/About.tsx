import { Heading } from "@/components/common/Heading";

export function About() {
    return (
        <>
            <Heading
                id="about"
                heading="About"
                subheading="How it works?"
            />
            <p className="text-lg text-center text-primary leading-8">
                We give markdown documents superpowers to make data storytelling and analysis easy.
                Using DataHub you can easily <strong>mix rich text content with data and data visualisations</strong>.
                No need to code or embed your charts and tables:
                they can be added to the document with a very simple syntax, either by passing inline data or simply referencing your data files.
                What you end up with is a plain text, human-readable document enriched with data visualisations,
                that is simple to edit and looks awesome when published with DataHub.
            </p>
        </>
    )
}
