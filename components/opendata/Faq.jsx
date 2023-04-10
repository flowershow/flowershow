import { Disclosure } from "@headlessui/react";
import { ArrowCircleRightIcon } from "@heroicons/react/outline";

export default function Faq() {
  return (
    <div className="flex justify-center">
      <div className="max-w-7xl w-full">
        <section
          className="py-24 bg-center"
          style={{
            backgroundImage: `url("/static/img/opendata/flex-ui-assets/elements/pattern-white.svg")`,
          }}
        >
          <div className="container px-4 mx-auto">
            <div className="flex flex-wrap -mx-4">
              <div className="w-full md:w-1/2 px-4 mb-20 md:mb-0">
                <div className="max-w-md">
                  <h2 className="mb-4 text-4xl xl:text-5xl tracking-tight text-[#2A3342] font-bold ">
                    Frequently Asked Questions
                  </h2>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <div className="flex flex-col md:items-left items-center justify-center">
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <Disclosure.Button>
                          <div className="max-w-md flex justify-between w-screen mb-2 md:mb-0 text-[#2A3342] px-4">
                            <div className="md:pr-10 mb-2 md:mb-0 ">
                              <h3 className="mb-4 text-xl text-[#2A3342] font-bold">
                                What is DataHub Open Data?
                              </h3>
                            </div>
                            <div className="shrink-0 w-6">
                              <ArrowCircleRightIcon
                                className={
                                  open
                                    ? " rotate-90  transform text-orange-400"
                                    : "text-orange-400"
                                }
                              />
                            </div>
                          </div>
                        </Disclosure.Button>
                        <Disclosure.Panel>
                          <div className="flex">
                            <div className="max-w-md">
                              <p className="mx-auto w-full text-[#556987] text-justify font-medium mb-8 px-4">
                                DataHub Open Data is the revolutionary platform
                                that makes working with open data effortless for
                                local governments and cities. It boasts a sleek
                                and intuitive user interface, allowing for a
                                seamless and enjoyable experience while working
                                with data. Extremely affordable. One-click
                                setup. No code.
                              </p>
                            </div>
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <Disclosure.Button>
                          <div className="max-w-md flex justify-between w-screen mb-2 md:mb-0 text-[#2A3342] px-4">
                            <div className="md:pr-10 mb-2 md:mb-0 ">
                              <h3 className="mb-4 text-xl text-[#2A3342] font-bold">
                                How much times it takes?
                              </h3>
                            </div>
                            <div className="shrink-0 w-6">
                              <ArrowCircleRightIcon
                                className={
                                  open
                                    ? " rotate-90  transform text-orange-400"
                                    : "text-orange-400"
                                }
                              />
                            </div>
                          </div>
                        </Disclosure.Button>
                        <Disclosure.Panel>
                          <div className="flex">
                            <div className="max-w-md w-screen overflow-hidden px-4">
                              <p className="mx-auto w-screen text-[#556987] text-left font-medium flex-none">
                                10 minutes. For real. It’s a three-step setup:
                              </p>
                              <p className="mx-auto w-screen text-[#556987] text-left font-medium flex-none">
                                1. Sign up
                              </p>
                              <p className="mx-auto w-screen text-[#556987] text-left font-medium flex-none">
                                2. Choose a theme for your portal
                              </p>
                              <p className="mx-auto w-screen text-[#556987] text-left font-medium flex-none mb-8">
                                3. You are all set!
                              </p>
                            </div>
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <Disclosure.Button>
                          <div className="max-w-md flex justify-between w-screen mb-2 md:mb-0 text-[#2A3342] px-4">
                            <div className="md:pr-10 mb-2 md:mb-0 ">
                              <h3 className="mb-4 text-xl text-[#2A3342] font-bold text-start text-left">
                                Can we host the instance on our cloud or
                                on-premise?
                              </h3>
                            </div>
                            <div className="shrink-0 w-6">
                              <ArrowCircleRightIcon
                                className={
                                  open
                                    ? " rotate-90  transform text-orange-400"
                                    : "text-orange-400"
                                }
                              />
                            </div>
                          </div>
                        </Disclosure.Button>
                        <Disclosure.Panel>
                          <div className="flex">
                            <div className="max-w-md ">
                              <p className="mx-auto w-full text-[#556987] text-justify font-medium mb-8 px-4">
                                Whether you prefer to host your data in the
                                cloud or on your own servers, we&aposve got you
                                covered. Choose the option that works best for
                                you.
                              </p>
                            </div>
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <Disclosure.Button>
                          <div className="max-w-md flex justify-between w-screen mb-2 md:mb-0 text-[#2A3342] px-4">
                            <div className="md:pr-10 mb-2 md:mb-0 ">
                              <h3 className="mb-4 text-xl text-[#2A3342] font-bold text-start text-left">
                                Is it possible to migrate from our cloud to
                                yours?
                              </h3>
                            </div>
                            <div className="shrink-0 w-6">
                              <ArrowCircleRightIcon
                                className={
                                  open
                                    ? " rotate-90  transform text-orange-400"
                                    : "text-orange-400"
                                }
                              />
                            </div>
                          </div>
                        </Disclosure.Button>
                        <Disclosure.Panel>
                          <div className="flex">
                            <div className="max-w-md ">
                              <p className="mx-auto w-full text-[#556987] text-justify font-medium mb-8 px-4">
                                Yes, migrating from one cloud to another can be
                                done with ease. We have the right approach and
                                tools to make the migration seamless and
                                minimally disruptive to your operations.
                              </p>
                            </div>
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <Disclosure.Button>
                          <div className="max-w-md flex justify-between  w-screen mb-2 md:mb-0 text-[#2A3342] px-4">
                            <div className="md:pr-10 mb-2 md:mb-0 ">
                              <h3 className="mb-4 text-xl text-[#2A3342] font-bold">
                                Is free trial available?
                              </h3>
                            </div>
                            <div className="shrink-0 w-6">
                              <ArrowCircleRightIcon
                                className={
                                  open
                                    ? " rotate-90  transform text-orange-400"
                                    : "text-orange-400"
                                }
                              />
                            </div>
                          </div>
                        </Disclosure.Button>
                        <Disclosure.Panel>
                          <div className="flex">
                            <div className="max-w-md w-screen overflow-hidden">
                              <p className="mx-auto w-screen text-[#556987] text-left font-medium mb-8 px-4">
                                Yes. 14 days.
                              </p>
                            </div>
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
