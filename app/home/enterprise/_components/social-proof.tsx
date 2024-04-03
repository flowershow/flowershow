import Image from "next/image";
import Link from "next/link";
import { Heading } from "@/components/heading";

export default function SocialProof() {
  const logos = [
    {
      name: "ODNI",
      src: "/Open-Data-Northern-Ireland-grey.png",
      url: "https://www.opendatani.gov.uk/",
      style: "object-center",
    },
    {
      name: "Birmingham",
      src: "/logo-birm.svg",
      url: "https://www.cityobservatory.birmingham.gov.uk/",
      style: "max-h-8",
    },
    {
      name: "UAE",
      src: "/fcsc-grey-transparent.png",
      url: "https://opendata.fcsc.gov.ae/",
      style: "",
    },
    {
      name: "OECD",
      src: "/OECD-grey.png",
      url: "https://www.oecd.org/",
      style: "max-h-14",
    },
    {
      name: "Sigma2",
      src: "/sigma2-light-transparent.png",
      url: "https://www.sigma2.no/",
      style: "max-h-14",
    },
    {
      name: "Marcus Institute",
      src: "/Marcus_Institute_HMS_vertical-grey-transparent.png",
      url: "https://data.hsl.harvard.edu/",
      style: "max-h-14",
    },
  ];

  return (
    <>
      <Heading
        id="trusted-by"
        heading="Trusted by"
        subheading="Powering data portals worldwide"
      />
      <div className="flex max-w-7xl justify-center" tabIndex={0}>
        <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-5">
          {logos.map((logo) => (
            <Link
              className="flex h-full max-h-24 w-full items-center justify-center rounded bg-slate-100 p-10 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 md:w-1/3 xl:w-1/5"
              key={logo.name}
              title={logo.name}
              href={logo.url}
            >
              <Image
                className={`bypass-filter h-auto w-auto ${logo.style}`}
                src={logo.src}
                alt={`${logo.name} Logo`}
                title={logo.name}
                height={50}
                width={150}
              />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
