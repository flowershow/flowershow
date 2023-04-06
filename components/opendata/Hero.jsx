export default function Hero() {
  return (
    <>
      <div className="flex flex-wrap justify-center">
        <div className="max-w-7xl w-full">
          <section
            className="relative bg-white bg-center overflow-hidden font-['Poppins']"
            style={{
              backgroundImage: `url("/static/img/opendata/flex-ui-assets/elements/pattern-white.svg")`,
            }}
          >
            <div className="bg-transparent">
              <div className="relative pt-16 md:pt-24 pb-20 md:pb-28 lg:pb-56">
                <div className="container px-4 mx-auto">
                  <div className="relative z-10 flex flex-wrap -mx-4">
                    <div className="w-full md:w-1/2 px-4 mb-12 md:mb-0 ">
                      <h1 className="mb-8 text-4xl md:text-5xl lg:text-[3.5rem] text-[#2A3342] font-bold tracking-tight ">
                        DataHub Open Data -<br />
                        The Home For Your Open Data
                      </h1>
                      <p className="mb-8 md:text-xl text-[#556987]">
                        Build your open data portal in 10 minutes.
                        <br />
                        Fast, easy, cost-effective.
                      </p>
                      <div className="flex flex-wrap mb-8 md:mb-16">
                        <div className="w-full md:w-auto py-1 md:py-0 md:mr-4 mb-4">
                          <a
                            className="inline-block py-3 px-7 w-full text-base md:text-lg leading-4 text-green-50 font-medium text-center bg-orange-400 hover:bg-orange-600 focus:ring-2 focus:ring-orange-600 focus:ring-opacity-50 rounded-md shadow-sm"
                            href="https://0613d040.sibforms.com/serve/MUIEALj2WFbU9yL02PVaMgzs3hkvcZuwlykYgSgM-xMlV0SJM4enslTGr-ttHyFskF-CfyMw5X8UkI0hxJw16pZAhvguQWID5MOD21FzHqQsCi2gXYkWJkR-IU2AWyCRL7qtjScPcMmIFwu5JR6KcCuA9s-W5k1ZRb4TQTC13RLxCJm3cgc0eFW03-uFFcgf1-5Y6E-akouITwXc"
                          >
                            See the demo
                          </a>
                        </div>
                        <div className="w-full md:w-auto py-1 md:py-0 md:mr-4">
                          <a
                            className="inline-block py-3 px-7 w-full text-base md:text-lg leading-4 text-orange-400 font-medium text-center bg-white hover:bg-orange-600 hover:text-white focus:ring-2 border border-orange-400 ring-orange-600 focus:ring-opacity-50 rounded-md shadow-sm"
                            href="https://calendar.app.google/LT4acVdKn3Cxm2MXA"
                          >
                            Schedule a call
                          </a>
                        </div>
                        <div className="w-full md:w-auto py-1 md:py-0"></div>
                      </div>
                      <p className="mb-6 md:mb-4 text-sm text-[#8896AB] font-medium text-center md:text-left hidden md:block">
                        Trusted by
                      </p>
                      <div className="flex-wrap items-center grayscale -mx-3 hidden md:flex">
                        <div className="w-full md:w-auto px-3 mb-6 lg:mb-0">
                          <img
                            className="mx-auto w-40"
                            src="static/img/opendata/logo-wb.png"
                            alt=""
                          />
                        </div>
                        <div className="w-full md:w-auto px-3 mb-6 lg:mb-0">
                          <img
                            className="mx-auto w-32"
                            src="static/img/opendata/logo-datagov.png"
                            alt=""
                          />
                        </div>
                        <div className="w-full md:w-auto px-3 mb-6 lg:mb-0">
                          <img
                            className="mx-auto w-32"
                            src="static/img/opendata/logo-oecd.png"
                            alt=""
                          />
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 px-8 py-4">
                      <video
                        className="drop-shadow-md border rounded-2xl"
                        muted
                        autoPlay
                        loop
                      >
                        <source src="/static/img/opendata/hero-demo.mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <section
        className="py-20 xl:pt-24 max-w-screen"
        style={{
          backgroundImage: `url("/static/img/opendata/flex-ui-assets/elements/pattern-light1.svg")`,
        }}
      >
        <div className="flex justify-center">
          <div className="max-w-7xl">
            <div className="container px-4">
              <h3 className="mb-8 text-center font-medium leading-6 text-[#8896AB]">
                USED & TRUSTED BY OVER 500 SMALL AND HUGE COMPANIES
              </h3>
              <div className="flex flex-wrap justify-left md:justify-center -mx-4">
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8 md:hidden">
                  <a href="https://data.worldbank.org/">
                    <div className="flex items-center h-32 md:h-36 px-4 rounded-md bg-white shadow-md ">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-wb.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8 md:hidden">
                  <a href="https://data.gov/">
                    <div className="flex items-center h-32 md:h-36 px-4 rounded-md bg-white shadow-md">
                      <img
                        href="https://data.gov/"
                        className="mx-auto"
                        src="static/img/opendata/logo-datagov.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8 md:hidden">
                  <a href="https://data.oecd.org/">
                    <div className="flex items-center h-32 md:h-36 px-4  rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-oecd.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8 ">
                  <a href="https://opendata.swiss/en/">
                    <div className="flex items-center h-32 md:h-36 px-4  rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-odsw.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8">
                  <a href="https://www.opendatani.gov.uk">
                    <div className="flex items-center h-32 md:h-36 px-4  rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-odni.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8">
                  <a href="https://www.cityobservatory.birmingham.gov.uk/">
                    <div className="flex items-center h-32 md:h-36 px-4  rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-birm.svg"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8">
                  <a href="https://data.santamonica.gov/">
                    <div className="flex items-center h-32 md:h-36 px-4 rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-csm.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4">
                  <a href="https://opendata.fcsc.gov.ae/">
                    <div className="flex items-center h-32 md:h-36 px-4 md:px-8 rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-fcsc.png"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
                <div className="w-1/2 md:w-1/3 lg:w-1/6 px-4 mb-8">
                  <a href="https://www.opendata.dk/">
                    <div className="flex items-center h-32 md:h-36 px-4 md:px-8 rounded-md bg-white shadow-md">
                      <img
                        className="mx-auto"
                        src="static/img/opendata/logo-oddk.svg"
                        alt=""
                      />
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
