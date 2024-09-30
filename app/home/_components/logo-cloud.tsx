import { Container } from "@/components/container";
import Image from "next/image";

export function LogoCloud() {
  return (
    <Container>
      <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
        <Image
          alt="Data.gov"
          src="/data_gov.svg"
          width={158}
          height={48}
          className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
        />
        <Image
          alt="NHS"
          src="/NHS.png"
          width={158}
          height={48}
          className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
        />
        <Image
          alt="OECD"
          src="/OECD.png"
          width={158}
          height={48}
          className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
        />
        <Image
          alt="FedEx"
          src="/FedEx.png"
          width={158}
          height={48}
          className="col-span-2 max-h-12 w-full object-contain sm:col-start-2 lg:col-span-1"
        />
        <Image
          alt="The World Bank Group"
          src="/world_bank.png"
          width={158}
          height={48}
          className="col-span-2 col-start-2 max-h-12 w-full object-contain sm:col-start-auto lg:col-span-1"
        />
      </div>
    </Container>
  );
}
