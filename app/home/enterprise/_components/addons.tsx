import {
  ChatBubbleBottomCenterIcon,
  CloudIcon,
  UserIcon,
  UsersIcon,
  CodeBracketSquareIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/solid";
import { Heading } from "@/components/heading";

const addOns = [
  {
    title: "Data API",
    description:
      "Ingest tabular data into structured database so that your users can query the data via API to build their own data analysis, dashboards and apps.",
    href: "/docs/dms/data-api",
    icon: CloudIcon,
    iconForeground: "text-secondary",
    iconBackground: "bg-slate-100 dark:bg-slate-800",
  },
  {
    title: "Custom dashboards",
    description:
      "Build custom data dashboards using your raw data. Share insights with your audience.",
    href: "/docs/dms/dashboards",
    icon: PresentationChartBarIcon,
    iconForeground: "text-secondary",
    iconBackground: "bg-slate-100 dark:bg-slate-800",
  },
  {
    title: "Data Processing & ETL",
    description:
      "Create data pipelines and connect your data source to auto publish datasets.",
    href: "/docs/dms/flows",
    icon: CodeBracketSquareIcon,
    iconForeground: "text-secondary",
    iconBackground: "bg-slate-100 dark:bg-slate-800",
  },
  {
    title: "Harvesting",
    description: "Harvest metadata from other similar catalogs.",
    href: "/docs/dms/harvesting",
    icon: UsersIcon,
    iconForeground: "text-secondary",
    iconBackground: "bg-slate-100 dark:bg-slate-800",
  },
  {
    title: "Data curator services",
    description: "Hire our data engineers team to curate your datasets.",
    href: "https://calendar.app.google/LT4acVdKn3Cxm2MXA",
    icon: UserIcon,
    iconForeground: "text-secondary",
    iconBackground: "bg-slate-100 dark:bg-slate-800",
  },
  {
    title: "Request your own add-on",
    description: "Schedule a quick call with us to describe your requirements.",
    href: "https://calendar.app.google/LT4acVdKn3Cxm2MXA",
    icon: ChatBubbleBottomCenterIcon,
    iconForeground: "text-secondary",
    iconBackground: "bg-slate-100 dark:bg-slate-800",
  },
];

export default function Example() {
  return (
    <>
      <Heading
        id="addons"
        heading="Add-ons"
        subheading="Explore available add-ons for our Cloud plan"
      />
      <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-gray-200 shadow dark:bg-slate-800 sm:grid sm:grid-cols-2 sm:gap-px sm:divide-y-0">
        {addOns.map((addOn, actionIdx) => (
          <div
            key={addOn.title}
            className={clsx(
              actionIdx === 0
                ? "rounded-tl-lg rounded-tr-lg sm:rounded-tr-none"
                : "",
              actionIdx === 1 ? "sm:rounded-tr-lg" : "",
              actionIdx === addOns.length - 2 ? "sm:rounded-bl-lg" : "",
              actionIdx === addOns.length - 1
                ? "rounded-bl-lg rounded-br-lg sm:rounded-bl-none"
                : "",
              "group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 dark:bg-slate-900",
            )}
          >
            <div>
              <span
                className={clsx(
                  addOn.iconBackground,
                  addOn.iconForeground,
                  "inline-flex rounded-lg p-3 ring-4 ring-white dark:ring-slate-800",
                )}
              >
                <addOn.icon className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-base font-semibold leading-6">
                <a
                  href={addOn.href}
                  title={addOn.title}
                  className="focus:outline-none"
                >
                  {/* Extend touch target to entire panel */}
                  <span className="absolute inset-0" aria-hidden="true" />
                  {addOn.title}
                </a>
              </h3>
              <p className="mt-2 text-sm opacity-75">{addOn.description}</p>
            </div>
            <span
              className="pointer-events-none absolute right-6 top-6 group-hover:text-gray-400 dark:text-gray-300"
              aria-hidden="true"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
              </svg>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
