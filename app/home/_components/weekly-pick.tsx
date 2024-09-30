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
          Country Codes
        </p>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Need accurate country codes? This dataset provides a comprehensive
          list of country codes alongside their official country names. It’s
          available in a convenient CSV format, ready for free download. Ideal
          for developers, analysts, and anyone handling international data or
          building location-based applications.
        </p>
      </div>
      <div className="my-8">
        {/* @ts-expect-error */}
        <FlatUiTable
          data={{ url: "/core/country-codes/_r/-/data/country-codes.csv" }}
        />
      </div>
      <div className="text-end">
        <Link
          href="/core/country-codes"
          className="text-orange-400 hover:text-orange-500"
        >
          <span>View dataset →</span>
        </Link>
      </div>
    </Container>
  );
}
