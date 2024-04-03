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
        <div className="relative pt-16 pb-20 px-4 sm:px-6 lg:pb-28 lg:px-8">
            <div className="relative max-w-7xl mx-auto">
                <div className="text-center">
                    <h2 className="tracking-tight font-semibold text-4xl">
                        Solutions
                    </h2>
                    <p className="mt-3 max-w-2xl mx-auto text-xl opacity-75 sm:mt-4">
                        Use our solution for
                    </p>
                </div>
                <div className="mt-20 max-w-lg mx-auto grid gap-8 lg:grid-cols-2 lg:max-w-6xl">
                    {solutions.map((el) => (
                        <div
                            key={el.title}
                            className="bg-slate-100 dark:bg-slate-900 px-6 py-8 space-y-6 flex flex-col rounded shadow overflow-hidden"
                        >
                            <div className="flex-shrink-0">
                                <img
                                    className="h-28 w-full object-fit"
                                    src={el.icon}
                                    alt={el.title}
                                    title={el.title}
                                />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="flex-1">
                                    <div className="block mt-2">
                                        <p className="text-xl text-center font-semibold">
                                            {el.title}
                                        </p>
                                        <p className="mt-3 text-base text-center opacity-75">
                                            {el.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
