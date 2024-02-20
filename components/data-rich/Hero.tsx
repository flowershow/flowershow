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
    <div className="relative isolate text-left">
      <div className="mx-auto flex flex-row flex-wrap justify-around py-8 sm:py-12 lg:py-14">
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
        <div>
          <div className="mt-3 inline-flex space-x-6 sm:mt-4 lg:mt-2">
            <h1 className="max-w-lg bg-clip-text text-4xl font-bold text-[#8F56D7]">
              DataHub Cloud
            </h1>
          </div>
          <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight dark:text-white sm:text-6xl ">
            Build elegant data-driven sites with markdown &{" "}
            <span className="text-[#8F56D7]">deploy in seconds.</span>
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
                <span className="left-1 top-1 h-5 w-5 text-[#8F56D7]">
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
            <Button
              href="https://datarich-demo.datahub.io/"
              variant="outline"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>See the guide</span>
            </Button>
          </div>
          <p className="mt-8">
            Built with<span className="mx-1.5 text-xl">❤</span>by
            <a
              href="https://www.datopian.com/"
              rel="noopener noreferrer"
              target="_blank"
              className="font-medium"
            >
              <Image
                src="/datopian-logo-black.png"
                alt=""
                className="mx-1.5 mb-1.5 inline h-5"
                width={20}
                height={20}
              />
              <span>Datopian</span>
            </a>
          </p>
        </div>
        <div className="relative min-w-[40%]">
          <Image
            src="/Readme.png"
            alt=""
            className="relative -top-8 w-3/4 rounded-lg shadow-xl"
            width={490}
            height={540}
          />
          <Image
            src="/my-datarich-blog.png"
            alt=""
            className="absolute left-1/3 top-12 w-3/4 rounded-lg shadow-2xl"
            width={490}
            height={540}
          />
        </div>
      </div>
    </div>
  );
}
