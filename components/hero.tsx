import { Button } from "@/components/button";

export function Hero({
  title,
  description,
  Visual,
  features,
  actions,
}: {
  title: string | JSX.Element;
  description: string;
  Visual: () => JSX.Element;
  features?: string[];
  actions?: {
    label: string;
    href: string;
    target?: "_blank" | "_self";
    variant?: "outline" | "solid";
  }[];
}) {
  return (
    <div className="relative isolate">
      <div className="mt-8 pb-20 sm:mt-10 lg:flex lg:items-center lg:gap-x-10 xl:mt-12">
        {/* <div className="flex">
                        <div className="relative flex items-center gap-x-4 rounded-full px-4 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                            <span className="font-semibold text-indigo-600">We’re hiring</span>
                            <span className="h-4 w-px bg-gray-900/10" aria-hidden="true" />
                            <a href="#" className="flex items-center gap-x-1">
                                <span className="absolute inset-0" aria-hidden="true" />
                                See open positions
                                <SomeIcon className="-mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                            </a>
                        </div>
                    </div> */}
        {/* left column */}
        <div className="mx-auto max-w-2xl flex-1 lg:mx-0">
          <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight dark:text-white sm:text-6xl ">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
            {description}
          </p>
          {features && (
            <div className="mt-6">
              {features.map((feature) => (
                <p
                  className="flex items-center space-x-2 text-lg font-medium leading-8 text-primary dark:text-primary-dark"
                  key={feature}
                >
                  <span className="left-1 top-1 h-5 w-5 text-orange-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </span>
                  <span>{feature}</span>
                </p>
              ))}
            </div>
          )}
          <div className="mt-10 flex gap-x-6">
            {actions?.map(({ label, href, target = "_self", variant }) => (
              <Button
                key={label}
                href={href}
                variant={variant}
                target={target}
                rel={target === "_blank" ? "noopener noreferrer" : undefined}
              >
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
        {/* right column */}
        <div className="mx-auto mt-24 max-w-2xl flex-1 lg:mx-0 lg:mt-0">
          <Visual />
        </div>
      </div>
    </div>
  );
}
