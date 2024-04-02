import { Heading } from "@/components/heading";

const items = [
  {
    title: "Open Data Northern Ireland",
    href: "https://www.opendatani.gov.uk/",
    image: "/odni.webp",
    description: "Government Open Data Portal",
  },
  {
    title: "Birmingham City Observatory",
    href: "https://www.cityobservatory.birmingham.gov.uk/",
    image: "/birmingham.webp",
    description: "Government Open Data Portal",
  },
  {
    title: "UAE Open Data",
    href: "https://opendata.fcsc.gov.ae/",
    image: "/uae.webp",
    description: "Government Open Data Portal",
    sourceUrl: "https://github.com/FCSCOpendata/frontend",
  },
  {
    title: "Datahub Open Data",
    href: "https://opendata.datahub.io/",
    image: "/datahub.webp",
    description: "Demo Data Portal by DataHub",
  },
];

export default function Showcases() {
  return (
    <>
      <Heading
        id="showcases"
        heading="Showcases"
        subheading="Discover what's being powered by PortalJS"
        accentColor="cyan-500"
      />
      <div className="not-prose my-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item) => {
          return <ShowcasesItem item={item} />;
        })}
      </div>
    </>
  );
}

function ShowcasesItem({ item }) {
  return (
    <a
      className="border-1 group relative overflow-hidden rounded shadow-lg"
      target="_blank"
      href={item.href}
    >
      <div
        className="aspect-video w-full bg-cover bg-top bg-no-repeat transition-all duration-200 group-hover:scale-105 group-hover:blur-sm"
        style={{ backgroundImage: `url(${item.image})` }}
      >
        <div className="h-full w-full bg-black opacity-0 transition-all duration-200 group-hover:opacity-50"></div>
      </div>
      <div>
        <div className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center px-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
          <div className="text-center text-primary-dark">
            <span className="text-xl font-semibold">{item.title}</span>
            <p className="text-base font-medium">{item.description}</p>
          </div>
        </div>
      </div>
    </a>
  );
}
