import { useEffect, useRef } from "react";
import Typed from "typed.js";

export default function Hero() {
  const el = useRef(null);
  const typed = useRef(null);

  useEffect(() => {
    const options = {
      strings: ["open data platforms", "data catalogs", "data lakes"],
      typeSpeed: 50,
      backSpeed: 50,
      loop: true,
    };

    typed.current = new Typed(el.current, options);
    return () => {
      typed.current.destroy();
    };
  }, []);

  return (
    <section className="my-16 mx-auto max-w-7xl px-4 sm:my-24 sm:px-6 lg:my-32">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
          <h1>
            <span className="text-4xl sm:text-5xl xl:text-6xl tracking-tight font-extrabold">
              Datahub Toolkit
            </span>
            <span className="mt-4 block text-3xl sm:text-4xl xl:text-5xl tracking-tight font-bold">
              The open platform for
              {/* all your data needs */}
            </span>
            <span className="relative mt-1 block text-3xl sm:text-4xl xl:text-5xl tracking-tight font-bold">
              <span ref={el} style={{ whiteSpace: "pre" }} />
            </span>
          </h1>
          <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
            A complete solution for open data platforms, enterprise data
            catalogs, data lakes and data management. Open source, mature,
            fully-featured and production ready. Trusted by governments,
            startups, nonprofits and the Fortune 500.
          </p>
          <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
            <div className="rounded-md shadow">
              <a
                href="https://datahub.io/docs/dms/ "
                target="_blank"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded text-white bg-orange-400 hover:underline md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </a>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-3">
              <a
                href="https://calendar.app.google/LT4acVdKn3Cxm2MXA"
                target="_blank"
                className="w-full flex items-center justify-center px-8 py-3 border border-black text-base font-medium rounded hover:underline md:py-4 md:text-lg md:px-10"
              >
                Get a free consultation (30m)
              </a>
            </div>
          </div>

          <p className="my-10 text-l tracking-wide">
            <span>A product of</span>
            <a
              href="https://datopian.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/static/img/datopian-logo.png"
                alt="Datopian"
                className="mx-2 mb-1 h-6 inline"
              />
            </a>
            &mdash; we help organizations of all sizes to unleash the potential
            of data{" "}
            <a
              href="https://datopian.com/"
              className="text-theme-orange font-medium"
            >
              Find out more &raquo;
            </a>
          </p>
        </div>
        <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:col-span-6 lg:flex lg:items-start">
          <img className="w-full" src="/static/img/next/dms.png" alt="" />
        </div>
      </div>
    </section>
  );
}
