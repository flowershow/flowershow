import Image from "next/image";
import Link from "next/link";

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
        <div className="text-center max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-semibold mb-20">
                Powering data portals worldwide
            </h2>
            <div className="max-w-7xl flex justify-center" tabIndex={0}>
                <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-5 w-full">
                    {logos.map((logo) => (
                        <Link
                            className="flex items-center justify-center w-full md:w-1/3 xl:w-1/5 bg-slate-100 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 rounded shadow-sm h-full max-h-24 p-10"
                            key={logo.name}
                            title={logo.name}
                            href={logo.url}
                        >
                            <Image
                                className={`bypass-filter w-auto h-auto ${logo.style}`}
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
        </div>
    );
}
