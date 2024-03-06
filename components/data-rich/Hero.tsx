import { Button } from "@/components/common/Button";
/* import { CheckCircleIcon } from "@heroicons/react/24/solid" */
import Image from "next/image";

const Points = [
  "Easy to use",
  "Markdown-based",
  "Hosted for you",
  "Run-off GitHub",
  "Open source",
];
export function Hero() {
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
            Build elegant data-driven sites with markdown &{" "}
            <span className="text-orange-400">deploy in seconds.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Publish datasets, data stories and data portals using markdown with
            a few clicks.
          </p>
          <div className="mt-6">
            {Points.map((point) => (
              <p
                className="flex items-center space-x-2 text-lg font-medium leading-8 text-primary dark:text-primary-dark"
                key={point}
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
                <span>{point}</span>
              </p>
            ))}
          </div>
          <div className="mt-10 flex gap-x-6">
            <Button href="https://tally.so/r/wad1O2">
              <span>Join the waitlist</span>
            </Button>
            {/* <Button
                            href="https://dev.datahub.io/@olayway/datarich-demo"
                            variant="outline"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <span>See the guide</span>
                        </Button> */}
          </div>
        </div>
        {/* right column */}
        <div className="mx-auto mt-24 max-w-2xl flex-1 lg:mx-0 lg:mt-0">
          <div className="relative">
            <Image
              src="/Readme.png"
              alt=""
              className="relative -top-8 w-3/4 rounded-lg shadow-xl"
              width={490}
              height={540}
              unoptimized
            />
            <Image
              src="/my-datarich-blog.png"
              alt=""
              className="absolute left-1/3 top-12 w-3/4 rounded-lg shadow-2xl"
              width={490}
              height={540}
              unoptimized
            />
          </div>
        </div>
      </div>
    </div>
  );
}
