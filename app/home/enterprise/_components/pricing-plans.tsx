"use client";
import { useRef, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { RadioGroup } from "@headlessui/react";
import AddonModal, { AddonModalHandle } from "./addon-modal";
import { Button } from "@/components/button";

export const frequencies = [
    { value: "monthly", label: "Monthly" },
    { value: "annually", label: "Annually" },
];

export const tiers = [
    {
        name: "Open Source",
        id: "tier-open-source",
        href: "/docs",
        cta: "Get started",
        featured: false,
        description:
            "Access source code and get started in your local machine or deploy to your cloud.",
        price: { monthly: "Free", annually: "Free" },
        mainFeatures: [
            { title: "Self hosted" },
            { title: "Self managed" },
            { title: "Community support via chat" },
        ],
    },
    {
        name: "Cloud",
        id: "tier-cloud",
        href: "https://cloud.portaljs.com/auth/signup",
        cta: "Sign up",
        featured: true,
        description: "Start your open data journey today.",
        price: { monthly: "$99", annually: "$1188" },
        mainFeatures: [
            { title: "Fully managed and hosted" },
            { title: "Unlimited datasets" },
            { title: "Multiple users with role based access control" },
            { title: "Unlimited groups and organizations" },
            { title: "Custom domain" },
            {
                title: "Custom UI: basic branding included",
                addons: {
                    type: "list",
                    items: [
                        {
                            text: "Basic branding includes your logo, font, colours, home page content.",
                        },
                        {
                            text: "You can purchase more frontend development work if you have more advanced requirements. Please, contact us to get a quote.",
                        },
                    ],
                },
            },
            {
                title: "10 GB of blob storage",
                addons: {
                    type: "table",
                    items: [
                        { key: "Next 100 GB", value: "$99 / mo" },
                        { key: "Configure your own S3 API compatible bucket", value: "$99 / mo" },
                    ],
                },
            },
            { title: "Dublin Core metadata standard" },
            { title: "DCAT metadata standard" },
            {
                title: "Data previews (CSV, Excel, PDF, JSON, TXT)",
                addons: {
                    type: "table",
                    items: [
                        { key: "XML, Web, Image", value: "$49 / mo" },
                        { key: "Power BI", value: "$99 / mo" },
                        { key: "Get a quote for any custom format", value: "Contact us" },
                    ],
                },
            },
            {
                title: "Geospatial data views (GeoJSON)",
                addons: {
                    type: "table",
                    items: [
                        { key: "KML", value: "$49 / mo" },
                        { key: "Shape", value: "$49 / mo" },
                        { key: "Google Earth Engine support", value: "$99 / mo" },
                        { key: "CartoDB", value: "$99 / mo" },
                        { key: "ArcGIS", value: "$99 / mo" },
                        { key: "Postgresql/Postgis", value: "$99 / mo" },
                        { key: "Blob storage (Geospatial CSV or similar in S3)", value: "$99 / mo" },
                    ],
                },
            },
            { title: "Data curator support (business hours)" },
            { title: "Technical support (24/7)" },
            { title: "Explore more add-ons", href: "/pricing#addons" },
        ],
    },
    {
        name: "Custom",
        id: "tier-custom",
        href: "https://calendar.app.google/LT4acVdKn3Cxm2MXA",
        cta: "Let's talk",
        featured: false,
        description: "Ideal for larger organizations to meet their requirements.",
        price: { monthly: "Contact", annually: "Contact" },
        mainFeatures: [
            { title: "Everything from Cloud plan" },
            { title: "Dedicated instance" },
            { title: "Bespoke development" },
            { title: "Public and/or private data" },
            {
                title:
                    "Fully managed and hosted based on your requirements (public/private/hybrid cloud or on-prem)",
            },
            { title: "Advanced security" },
            { title: "SAML/OAuth, Azure Active Directory integration or similar" },
            { title: "Service level agreements (SLA)" },
            { title: "Dedicated support team" },
        ],
    },
];

function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}
export default function PricingPlans() {
    const [frequency, setFrequency] = useState(frequencies[0]);
    const addonModalRef = useRef<AddonModalHandle>();

    return (
        <>
            <div className="mt-8 flex justify-center">
                <RadioGroup
                    value={frequency}
                    onChange={setFrequency}
                    className="grid grid-cols-2 gap-x-1 rounded-full bg-white/5 p-1 text-center text-xs font-semibold leading-5"
                >
                    <RadioGroup.Label className="sr-only">
                        Payment frequency
                    </RadioGroup.Label>
                    {frequencies.map((option) => (
                        <RadioGroup.Option
                            key={option.value}
                            value={option}
                            className={({ checked }) =>
                                classNames(
                                    checked ? "bg-secondary text-black" : "",
                                    "cursor-pointer rounded-full px-2.5 py-1"
                                )
                            }
                        >
                            <span>{option.label}</span>
                        </RadioGroup.Option>
                    ))}
                </RadioGroup>
            </div>
            <div className="lg:mb-14 relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-3">
                <div
                    className="hidden lg:absolute lg:inset-x-px lg:bottom-0 lg:top-4 lg:block lg:rounded-t-2xl lg:bg-slate-100 dark:lg:bg-gray-800/80 lg:ring-1 lg:ring-white/10"
                    aria-hidden="true"
                />
                {tiers.map((tier) => (
                    <div
                        key={tier.id}
                        className={classNames(
                            tier.featured
                                ? "z-10 bg-slate-200 dark:bg-slate-900 shadow-xl ring-1 ring-gray-900/10"
                                : "bg-slate-200 dark:bg-slate-900 ring-1 ring-white/10 lg:bg-transparent dark:lg:bg-transparent lg:pb-14 lg:ring-0",
                            "relative rounded-2xl"
                        )}
                    >
                        <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                            <h3
                                id={tier.id}
                                className={classNames(
                                    tier.featured ? "" : "",
                                    "text-sm font-semibold leading-6"
                                )}
                            >
                                {tier.name}
                            </h3>
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch">
                                <div className="mt-2 flex items-center gap-x-4">
                                    <p
                                        className={classNames(
                                            tier.featured ? "" : "",
                                            "text-4xl font-bold tracking-tight"
                                        )}
                                    >
                                        {tier.price[frequency!.value]}
                                    </p>
                                    <div className="text-sm leading-5">
                                        <p>USD</p>
                                        <p className={"opacity-75"}>{`${frequency!.value}`}</p>
                                    </div>
                                </div>
                                <Button
                                    href={tier.href}
                                    aria-describedby={tier.id}
                                    title={`${tier.name} - ${tier.cta}`}
                                    variant={tier.featured ? "solid" : "outline"}
                                >
                                    {tier.cta}
                                </Button>
                            </div>
                            <div className="mt-8 flow-root sm:mt-10">
                                <ul
                                    role="list"
                                    className={classNames(
                                        tier.featured
                                            ? "divide-gray-900/5 border-gray-900/5"
                                            : "divide-white/5 border-white/5 ",
                                        "-my-2 divide-y border-t text-sm leading-6 lg:border-t-0"
                                    )}
                                >
                                    {tier.mainFeatures.map((mainFeature) => (
                                        <li key={mainFeature.title} className="flex gap-x-3 py-2">
                                            <CheckIcon
                                                className={classNames(
                                                    tier.featured ? "text-secondary" : "",
                                                    "text-secondary h-6 w-5 flex-none"
                                                )}
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {mainFeature.href && (
                                                    <a
                                                        className="underline"
                                                        href={mainFeature.href}
                                                        title={mainFeature.title}
                                                    >
                                                        {mainFeature.title}
                                                    </a>
                                                )}
                                                {!mainFeature.href && mainFeature.title}{" "}
                                                {mainFeature.addons && (
                                                    <button
                                                        className="underline"
                                                        onClick={() =>
                                                            addonModalRef?.current?.open({
                                                                title: mainFeature.title,
                                                                // @ts-ignore
                                                                addons: mainFeature.addons,
                                                            })
                                                        }
                                                    >
                                                        (Add-ons available)
                                                    </button>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <AddonModal ref={addonModalRef} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
