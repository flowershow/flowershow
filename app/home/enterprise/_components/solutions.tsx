import { Heading } from "@/components/heading";

const solutions = [
  {
    title: "Open Data Portals and Platforms",
    description: `A Data Portal is a gateway to data. CKAN and PortalJS has been used to build many of the world’s
      leading open data portals ranging from national governments like data.gov to regional or city portals like London’s,
      Boston’s and Montreal’s.`,
    icon: "/data-portal-icon.svg",
  },
  {
    title: "Data Catalog & Metadata Management",
    description: `PortalJS provides everything you need in a modern, enterprise grade data catalog. Built on CKAN,
        the mature feature-rich open-source data catalog continuously refined for more than a decade.`,
    icon: "/data-collection-icon.svg",
  },
  {
    title: "Data Lake (house)",
    description: `Build your data lake on an open, sustainable and agile foundation. Our open architecture and tooling helps you build
        data lakes that can adapt and scale with your needs, integrating diverse tooling into a coherent whole.`,
    icon: "/data-lakes-icon.svg",
  },
  {
    title: "Data Management Infrastructure",
    description: `Develop a robust and powerful framework for managing data, for organizing data, for data engineering. It provides the
        basic systems, structures and patterns for organizations to enable and scale the flow of data within their enterprise.`,
    icon: "/data-infrastructure-icon.svg",
  },
];

export default function Solutions() {
  return (
    <>
      <Heading
        id="solution"
        heading="Solutions"
        subheading="Use our solution for"
      />
      <div className="mx-auto mt-20 grid max-w-lg gap-8 lg:max-w-6xl lg:grid-cols-2">
        {solutions.map((el) => (
          <div
            key={el.title}
            className="flex flex-col space-y-6 overflow-hidden rounded bg-slate-100 px-6 py-8 shadow dark:bg-slate-900"
          >
            <div className="flex-shrink-0">
              <img
                className="object-fit h-28 w-full"
                src={el.icon}
                alt={el.title}
                title={el.title}
              />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex-1">
                <div className="mt-2 block">
                  <p className="text-center text-xl font-semibold">
                    {el.title}
                  </p>
                  <p className="mt-3 text-center text-base opacity-75">
                    {el.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
