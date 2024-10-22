import { Metadata } from "next";
import Link from "next/link";
import {
  BookMarked,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Cpu,
  Earth,
  GraduationCap,
  HeartPulse,
  HandCoins,
  House,
  RadioTower,
  Mail,
  SunSnow,
  Thermometer,
  TrendingUp,
  Truck,
  Tv,
  Users,
  Waypoints,
  Wind,
  Swords,
  Globe,
  FileText,
  Archive,
} from "lucide-react";

import Germ from "@/components/icons/germ";
import Football from "@/components/icons/football";
import prisma from "@/server/db";
import { Heading } from "@/components/heading";
import { Container } from "@/components/container";
import { Section } from "@/components/section";
import { DataRequestBanner } from "@/components/data-request-banner";
import { env } from "@/env.mjs";
import { Newsletter } from "../_components/newsletter";

export const metadata: Metadata = {
  title: "DataHub Collections",
  description: "Curated dataset collections from DataHub",
  icons: ["/favicon.ico"],
  openGraph: {
    title: "DataHub Collections",
    description: "Curated dataset collections from DataHub",
    type: "website",
    url: `${env.NEXT_PUBLIC_ROOT_DOMAIN}/collections`,
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 627,
        alt: "Thumbnail",
      },
    ],
  },
  twitter: {
    title: "DataHub Collections",
    description: "Curated dataset collections from DataHub",
    card: "summary_large_image",
    images: [
      {
        url: "/thumbnail.png",
        width: 800,
        height: 418,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
  },
};

export default async function CollectionsPage() {
  const collectionsPages = await prisma.site.findFirst({
    where: {
      projectName: "collections",
      /* gh_repository: "datasets/awesome-data" */
    },
    select: { files: true },
  });

  const collections = collectionsPages?.files
    ? Object.values(collectionsPages.files)
        .filter(
          (page) => page._url !== "/" && page._url !== "notes/clio-infra.eu",
        )
        .map((page) => ({
          title: page.title,
          description: page.description,
          link: page._url,
          icon: matchIcon(page._url),
        }))
    : [];

  collections.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <>
      <div className="mt-12 md:mt-24">
        <Container className="text-center">
          <Heading
            id="collections"
            heading="Collections"
            subheading="Curated dataset collections"
          />
          <p className="max-w- mx-auto mb-[40px] max-w-[650px] text-center text-lg leading-8 text-primary">
            The awesome section presents collections of high quality datasets
            organized by topic. Home page for awesome collections is located in
            the{" "}
            <Link
              className="font-semibold"
              href="https://github.com/datasets/awesome-data"
            >
              awesome-data
            </Link>{" "}
            repository on GitHub and should be modified from there.
          </p>
        </Container>
      </div>

      <Container className="py-6">
        <ul
          role="list"
          className="grid grid-cols-1 place-items-stretch gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {collections.map((collection) => (
            <li
              key={collection.title}
              className="group col-span-1 flex flex-col rounded-lg border border-gray-50 bg-white text-center shadow transition duration-300 ease-in-out hover:shadow-md"
            >
              <Link href={`/collections/${collection.link}`}>
                <div className="flex flex-1 flex-col p-8">
                  <div className="mx-auto">
                    <collection.icon
                      className="h-8 w-8"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-6 text-sm font-medium text-gray-900">
                    {collection.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    {collection.description}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Section>
        <Newsletter />
      </Section>

      <DataRequestBanner />
    </>
  );
}

function matchIcon(url: string) {
  switch (url) {
    case "air-pollution":
      return Wind;
    case "bibliographic-data":
      return BookMarked;
    case "broadband":
      return RadioTower;
    case "climate-change":
      return Thermometer;
    case "climate-data":
      return SunSnow;
    case "coronavirus":
      return Germ;
    case "demographics":
      return Users;
    case "economic-data":
      return CircleDollarSign;
    case "education":
      return GraduationCap;
    case "football":
      return Football;
    case "geojson":
      return Earth;
    case "healthcare-data":
      return HeartPulse;
    case "inflation":
      return TrendingUp;
    case "linked-open-data":
      return Waypoints;
    case "logistics-data":
      return Truck;
    case "machine-learning-data":
      return Cpu;
    case "movies-and-tv":
      return Tv;
    case "opencorporates":
      return Building2;
    case "postal-codes-datasets":
      return Mail;
    case "property-prices":
      return House;
    case "stock-market-data":
      return ChartNoAxesCombined;
    case "reference-data":
      return FileText;
    case "war-and-peace":
      return Swords;
    case "wealth-income-and-inequality":
      return HandCoins;
    case "world-bank":
      return Globe;
    case "yago":
      return Archive;
    default:
      return Globe;
  }
}
