import { Button } from "@/components/button";
import clsx from "clsx";

export function Hero({
  title,
  description,
  announcement,
  features,
  actions,
  Visual,
  children,
}: {
  title: string | JSX.Element;
  description: string;
  announcement?: {
    content: string | JSX.Element;
    href: string;
  };
  features?: string[];
  actions?: {
    label: string;
    href: string;
    target?: "_blank" | "_self";
    variant?: "outline" | "solid";
  }[];
  Visual?: () => JSX.Element;
  children?: JSX.Element;
}) {
  return (
    <div className="relative isolate">
      <div
        className={clsx(
          "mt-8 pb-10 sm:mt-28",
          Visual && "lg:flex lg:items-center lg:gap-x-10 xl:mt-24",
        )}
      >
        {/* left column */}
        <div className={clsx("mx-auto flex-1", Visual && "max-w-2xl lg:mx-0")}>
          <div className="flex">
            {announcement && (
              <div className="relative rounded-full px-4 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                <a
                  href={announcement.href}
                  className="flex items-center gap-x-1"
                >
                  <span className="absolute inset-0" aria-hidden="true" />
                  {announcement.content}
                </a>
              </div>
            )}
          </div>
          <h1
            className={clsx(
              "mt-10 max-w-4xl text-4xl font-bold tracking-tight dark:text-white sm:text-6xl",
              !Visual && "max-w-none text-center",
            )}
          >
            {title}
          </h1>
          <p
            className={clsx(
              "mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400",
              !Visual && "max-w-none text-center",
            )}
          >
            {description}
          </p>
          {features && (
            <div
              className={clsx("mt-6", !Visual && "flex flex-col items-center")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
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
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </span>
                    <span>{feature}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
          <div
            className={clsx(
              "mt-5 flex gap-x-6",
              !Visual && "flex-col items-center",
            )}
          >
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
        {Visual && (
          <div className="mx-auto mt-24 max-w-2xl flex-1 lg:mx-0 lg:mt-0">
            <Visual />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
