"use client";
import PricingPlans from "./pricing-plans";
import { Heading } from "@/components/heading";

export default function Pricing() {
  return (
    <>
      <Heading
        id="pricing"
        heading="Pricing"
        subheading="Find the best plan for you"
      />
      <p className="mt-4 text-center text-2xl opacity-75">
        Our plans cover all ranges of budgets and needs
      </p>
      <PricingPlans />
    </>
  );
}
