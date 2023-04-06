export default function Features() {
  return (
    <>
      <div className="flex justify-center">
        <div className="max-w-7xl w-full">
          <section
            className="py-24 md:py-28 bg-white bg-center"
            style={{
              backgroundImage: `url("/static/img/opendata/flex-ui-assets/elements/pattern-white.svg")`,
            }}
          >
            <div className="container px-4 mx-auto">
              <div className="text-center text-[#2A3342]">
                <h3 className="mb-4 text-4xl md:text-5xl tracking-tight font-bold">
                  The most efficient way of working with open data
                </h3>
                <p className="mb-16 xl:mb-24 mx-auto text-lg md:text-xl text-[#556987] font-medium max-w-4xl">
                  Don&apost let data be a burden, let it be a catalyst for
                  progress with DataHub Open Data. Upgrade to a smarter, more
                  efficient way of working with open data today.&nbsp;
                </p>
                <div className="flex flex-wrap -mx-4">
                  <div className="w-full md:w-1/3 px-4 ">
                    <div className="h-full p-8 text-center hover:bg-white rounded-md hover:shadow-xl transition duration-200">
                      <div className="inline-flex h-16 w-16 mb-7 mx-auto items-center justify-center text-white bg-orange-400 rounded-lg">
                        <img
                          src="static/img/opendata/icon-star.png"
                          className="p-5"
                        />
                      </div>
                      <h3 className="mb-3 text-xl md:text-2xl leading-tight font-bold text-[#2A3342]">
                        Built by top experts
                      </h3>
                      <p className="font-medium text-[#556987]">
                        Built by the leading open source experts that
                        built&nbsp;
                        <a
                          href="https://ckan.org/"
                          className="underline hover:text-orange-400"
                        >
                          CKAN,{" "}
                        </a>
                        <a
                          href="https://frictionlessdata.io/"
                          className="underline hover:text-orange-400"
                        >
                          Frictionless Data
                        </a>
                        &nbsp;and&nbsp;
                        <a
                          href="https://datahub.io/"
                          className="underline hover:text-orange-400"
                        >
                          DataHub.io
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 px-4">
                    <div className="h-full p-8 text-center hover:bg-white rounded-md hover:shadow-xl transition duration-200">
                      <div className="inline-flex h-16 w-16 mb-7 mx-auto items-center justify-center text-white bg-orange-400 rounded-lg">
                        <img
                          src="static/img/opendata/icon-gear.png"
                          className="p-5"
                        />
                      </div>
                      <h3 className="mb-3 text-xl md:text-2xl leading-tight font-bold text-[#2A3342]">
                        Easy setup in three steps
                      </h3>
                      <p className="font-medium text-[#556987]">
                        With just a few clicks, you can set up a
                        professional-looking data portal that&aposs ready to use
                        in no time. No coding skills required.
                      </p>
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 px-4">
                    <div className="h-full p-8 text-center hover:bg-white rounded-md hover:shadow-xl transition duration-200">
                      <div className="inline-flex h-16 w-16 mb-7 mx-auto items-center justify-center text-white bg-orange-400 rounded-lg">
                        <img
                          src="static/img/opendata/icon-profit.png"
                          className="p-5"
                        />
                      </div>
                      <h3 className="mb-3 text-xl md:text-2xl leading-tight font-bold text-[#2A3342]">
                        Cost-effective
                      </h3>
                      <p className="font-medium text-[#556987]">
                        Designed specifically for organizations looking for an
                        affordable, cost-effective solution.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section
            className="py-24 bg-white bg-center"
            style={{
              backgroundImage: `url("/static/img/opendata/flex-ui-assets/elements/pattern-white.svg")`,
            }}
          >
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row gap-2 items-center mb-16 max-w-5xl xl:max-w-7xl text-[#2A3342]">
                <div className="w-full md:w-1/2 mb-16 md:mb-0">
                  <h2 className="mb-6 text-4xl md:text-5xl tracking-tight font-bold">
                    Let your team focus on what really matters - your data
                  </h2>
                  <p className="text-lg md:text-xl text-[#556987] font-medium">
                    Our platform takes care of the technology, so you can focus
                    on what matters most - thes value of your data.
                  </p>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="relative mx-auto md:mr-0 overflow-hidden rounded">
                    <video
                      className="rounded-2xl border drop-shadow-md"
                      muted
                      autoPlay
                      loop
                    >
                      <source src="static/img/opendata/upload-demo.mp4" />
                    </video>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 text-center md:text-left gap-2">
                <div className="w-full md mb-8">
                  <div className="inline-flex items-center justify-center mb-4 w-12 h-12 text-xl text-white bg-orange-400 font-semibold rounded-full">
                    1
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#2A3342]">
                    User-friendly Interface
                  </h3>
                  <p className="font-medium text-[#556987] ">
                    Say goodbye to frustration. Navigate and explore your data
                    with ease.
                  </p>
                </div>
                <div className="w-full mb-8">
                  <div className="inline-flex items-center justify-center mb-4 w-12 h-12 text-xl text-white bg-orange-400 font-semibold rounded-full">
                    2
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#2A3342]">
                    Drag-and-drop Feature
                  </h3>
                  <p className="font-medium text-[#556987] ">
                    Our drag-and-drop feature makes it easy for anyone to
                    publish open data, regardless of skill level.
                  </p>
                </div>
                <div className="w-full mb-8">
                  <div className="inline-flex items-center justify-center mb-4 w-12 h-12 text-xl text-white bg-orange-400 font-semibold rounded-full">
                    3
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#2A3342]">
                    Advanced Data Visualization
                  </h3>
                  <p className="font-medium text-[#556987] ">
                    Empower your users to uncover insights and trends in your
                    open data with our powerful self-service visualization
                    tools.
                  </p>
                </div>
                <div className="w-full mb-8 md:mb-0">
                  <div className="inline-flex items-center justify-center mb-4 w-12 h-12 text-xl text-white bg-orange-400 font-semibold rounded-full">
                    4
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#2A3342]">
                    Quick Insights
                  </h3>
                  <p className="font-medium text-[#556987] ">
                    Make your data come alive with our beautiful charts and
                    quick insights - showcasing your best datasets has never
                    been easier.
                  </p>
                </div>
                <div className="w-full mb-8 md:mb-0">
                  <div className="inline-flex items-center justify-center mb-4 w-12 h-12 text-xl text-white bg-orange-400 font-semibold rounded-full">
                    5
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#2A3342]">
                    CKAN-based
                  </h3>
                  <p className="font-medium text-[#556987] ">
                    Get the best features from CKAN. Perfect for organizations
                    looking for a lightweight and cost-effective solution.
                  </p>
                </div>
                <div className="w-full mb-8 md:mb-0">
                  <div className="inline-flex items-center justify-center mb-4 w-12 h-12 text-xl text-white bg-orange-400 font-semibold rounded-full">
                    6
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#2A3342]">
                    SaaS Experience
                  </h3>
                  <p className="font-medium text-[#556987] ">
                    Get more done, with less hassle without worrying about
                    maintenance and support. On our cloud or yours. You choose.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
