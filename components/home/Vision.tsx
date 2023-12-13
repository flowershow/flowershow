import { Heading } from "@/components/home/Heading";

export function Vision() {
    return (
        <>
            <Heading
                id="vision"
                heading="Our vision"
                subheading="Unified Content Management"
            />
            <p className="text-lg text-center text-primary leading-8">
                Imagine a world where Markdown isn’t just text - it’s an entry in a database, it's a source of structured and unstructured data. With MarkdownDB, we aim to balance the simplicity and accessibility of writing in Markdown with the
                <strong>ability to treat your collection of markdown files like a database </strong>
                (think Notion) - allowing, for example presenting each markdown file in a folder as a row in a sheet (e.g. for a project list or any other kind of collection), think querying your markdown files like a database e.g. show me documents with a created in the last week with "hello world" in the title or show me all tasks in all documents with "⏭️" emoji in the task (indicating it's next up!)
            </p>
        </>
    )
}
