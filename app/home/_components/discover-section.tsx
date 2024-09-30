import Link from "next/link";

import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { Heading } from "@/components/heading";

const features = [
  {
    name: "Country Codes",
    description:
      " ISO 3166-1-alpha-2, providing standardized country names and code elements.",
    url: "/core/country-codes",
  },
  {
    name: "S&P 500 Companies",
    description:
      "Comprehensive data on top-performing companies in the S&P 500 index.",
    url: "/core/s-and-p-500",
  },
  {
    name: "Airport Codes",
    description:
      "Get accurate airport codes from around the world for your travel or logistics needs.",
    url: "/core/airport-codes",
  },
  {
    name: "Country Polygons as GeoJSON",
    description: "Detailed geographic boundaries for countries worldwide.",
    url: "/core/geo-countries",
  },
];

export function DiscoverSection() {
  return (
    <Container>
      <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:grid-cols-2">
        <dl>
          <Heading
            id="features"
            heading="Core datasets"
            subheading="Curated datasets with high quality and up-to-date data"
            className="text-start"
          />
          <p className="mt-12 text-xl">
            We get it – finding reliable data can be a challenge. That’s why we
            provide frequently used datasets, carefully reviewed and updated, so
            the data you need is always accurate and ready.
          </p>
          <div className="mt-12">
            <Button href="/collections">Discover all datasets</Button>
          </div>
        </dl>
        <dl className="col-span-1 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.name} className="flex flex-col">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                {feature.name}
              </dt>
              <dd className="mt-1 text-base leading-7 text-gray-600">
                {feature.description}
              </dd>
              <div className="mt-2 flex shrink-0 grow items-end text-start font-semibold leading-7 text-orange-400 hover:text-orange-600">
                <Link href={feature.url}>View →</Link>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </Container>
  );
}
