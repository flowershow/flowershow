import { Heading } from "@/components/common/Heading";

export function About() {
    return (
        <>
            <Heading
                id="about"
                heading="About"
                subheading="What is a data-rich document?"
            />
            <p className="text-lg text-center text-primary leading-8">
                A data-rich document is a
                <strong>
                    {" "}markdown document with superpowers{" "}
                </strong>
                to make data storytelling and analysis easy.
                And so, in data-rich document the writer can easily mix formatted text content with data visualisations.
                This means that you don't have to code or embed your charts and tables; they can be added to the document with a very simple syntax, either by passing inline data or simply referencing your data files.
                What you end up with is a
                <strong>
                    {" "}plain text, human-readable document enriched with data visualisations
                </strong>
                , that is simple to edit and looks awesome when published with DataHub.
            </p>
        </>
    )
}
