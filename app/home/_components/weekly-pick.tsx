"use client";
import Link from "next/link";
import { FlatUiTable } from "@/components/client-components-wrapper";

import { Container } from "@/components/container";

export function WeeklyPick() {
  return (
    <Container>
      <div>
        <h2 className="text-base font-semibold leading-7 text-orange-400">
          WEEKLY PICK
        </h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Global Temperature Time Series
        </p>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Access extensive datasets from the GISS Surface Temperature (GISTEMP)
          analysis and the global component of Climate at a Glance (GCAG). These
          datasets include global monthly mean and annual mean temperature
          anomalies in degrees Celsius, providing detailed records of
          temperature changes over time. The GISTEMP data are available from
          1880 to the present, while the GCAG data span from 1850 to the
          present.
        </p>
      </div>
      <div className="my-8">
        {/* @ts-expect-error */}
        <FlatUiTable data={{ url: "/core/global-temp/_r/-/data/annual.csv" }} />
      </div>
      <div className="text-end">
        <Link
          href="/core/global-temp"
          className="text-orange-400 hover:text-orange-500"
        >
          <span>View dataset →</span>
        </Link>
      </div>
    </Container>
  );
}
