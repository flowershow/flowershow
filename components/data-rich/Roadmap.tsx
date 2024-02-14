import { Heading } from "@/components/common/Heading";

const timeline = [
  {
    id: 1,
    title: "🎉 MarkdownDB released! 🎉",
    description: `
First version of the package released under \`@flowershow/markdowndb\` with basic functionalities, like
indexing files into an SQLite database, extracting frontmatter data and basic JS API.
        `,
    date: "Apr 2023",
  },
  {
    id: 2,
    title: "Version 0.1.0",
    description:
      "We added support for extracting and querying forward links and backlinks.",
    date: "May 2023",
  },
  {
    id: 3,
    title: "Version 0.2.0",
    description:
      "We fixed some annoying bugs and renamed package from `@flowershow/markdowndb` to just `mddb`.",
    date: "Aug 2023",
  },
  {
    id: 4,
    title: "Version 1.0.0",
    description: "Support for custom document types and computed fields.",
    date: "Coming soon...",
  },
];

export function Roadmap() {
  return (
    <>
      <Heading
        id="roadmap"
        heading="Roadmap"
        subheading="What's new and what's coming"
      />
      <div className="flex flex-col gap-11 overflow-hidden pt-6">
        {timeline.map((item) => (
          <div key={item.id}>
            <div className="flex items-center text-sm font-semibold leading-6 text-indigo-600">
              <svg
                viewBox="0 0 4 4"
                className="mr-4 h-1 w-1 flex-none"
                aria-hidden="true"
              >
                <circle cx={2} cy={2} r={2} fill="currentColor" />
              </svg>
              {item.date}
              <div
                className="absolute -ml-2 h-px w-screen -translate-x-full bg-gray-900/10 sm:-ml-4 lg:static lg:-mr-6 lg:ml-8 lg:w-auto lg:flex-auto lg:translate-x-0"
                aria-hidden="true"
              />
            </div>
            <p className="mt-6 text-lg font-semibold leading-8 tracking-tight text-gray-900">
              {item.title}
            </p>
            <p className="mt-1 text-base leading-7 text-gray-600">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
