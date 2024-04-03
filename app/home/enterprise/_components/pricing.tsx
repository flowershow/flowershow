"use client";
import AddOns from "./addons";
import PricingPlans from "./pricing-plans";

export default function Pricing() {
    return (
        <div className="isolate overflow-hidden">
            <div className="flow-root pb-16 pt-24 lg:pb-0">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="relative z-10">
                        <h1 className="mx-auto max-w-4xl text-center text-4xl font-semibold tracking-tight">
                            Find the best plan for you
                        </h1>
                        <h2 className="mx-auto mt-4 max-w-2xl text-center text-lg leading-8 opacity-75">
                            Our plans cover all ranges of budgets and needs
                        </h2>
                    </div>
                    <PricingPlans />
                </div>
            </div>
            <div className="relative" id="addons">
                <div className="mx-auto max-w-7xl mt-16 px-6 py-24 sm:py-32 lg:px-8">
                    {/* Add-ons */}
                    <div className="relative z-10">
                        <h3 className="mx-auto max-w-4xl text-center text-3xl font-bold tracking-tight">
                            Add-ons
                        </h3>
                        <p className="mx-auto mt-4 mb-8 max-w-2xl text-center text-lg leading-8 opacity-75">
                            Explore available add-ons for our Cloud plan
                        </p>
                    </div>
                    <AddOns />
                </div>
            </div>
        </div>
    );
}
