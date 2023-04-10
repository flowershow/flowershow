import { Fragment } from "react";
import { Tab } from "@headlessui/react";

export default function Quotes() {
  return (
    <section className="flex flex-col justify-center items-center mx-auto max-w-9xl font-['Poppins'] mt-32 mb-12">
      <Tab.Group>
        <Tab.Panels>
          <Tab.Panel>
            <div className="xl:max-w-6xl lg:max-w-4xl md:max-w-2xl max-w-sm mt-32">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div className="">
                  <img
                    src="/static/img/opengov/quote.png"
                    alt="Quoted Person Image"
                    className="rounded-lg w-[28rem]"
                  />
                </div>
                <div className="flex flex-col pt-4 justify-center">
                  <div className="text-[#2A3342] text-lg md:text-3xl pb-4 lg:pb-14 font-semibold">
                    The best solution for anyone who wants to take open data to
                    the next level.
                  </div>
                  <div className="mb-4 text-lg lg:text-2xl text-[#333F51] font-semibold">
                    Rufus Pollock
                  </div>
                  <div className="text-lg text-[#556987]">
                    President & Founder at Datopian
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
          <Tab.Panel>
            <div className="xl:max-w-6xl lg:max-w-4xl md:max-w-2xl max-w-sm mt-32">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div className="">
                  <img
                    src="/static/img/opengov/quote.png"
                    alt="Quoted Person Image"
                    className="rounded-lg w-[28rem]"
                  />
                </div>
                <div className="flex flex-col pt-4 justify-center">
                  <div className="text-[#2A3342] text-lg md:text-3xl pb-4 lg:pb-14 font-semibold">
                    The best solution for anyone who wants to take open data to
                    the next level.
                  </div>
                  <div className="mb-4 text-lg lg:text-2xl text-[#333F51] font-semibold">
                    Rufus Pollock
                  </div>
                  <div className="text-lg text-[#556987]">
                    President & Founder at Datopian Enterprise
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
          <Tab.Panel>
            <div className="xl:max-w-6xl lg:max-w-4xl md:max-w-2xl max-w-sm mt-32">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div className="">
                  <img
                    src="/static/img/opengov/quote.png"
                    alt="Quoted Person Image"
                    className="rounded-lg w-[28rem]"
                  />
                </div>
                <div className="flex flex-col pt-4 justify-center">
                  <div className="text-[#2A3342] text-lg md:text-3xl pb-4 lg:pb-14 font-semibold">
                    The best solution for anyone who wants to take open data to
                    the next level.
                  </div>
                  <div className="mb-4 text-lg lg:text-2xl text-[#333F51] font-semibold">
                    Rufus Pollock
                  </div>
                  <div className="text-lg text-[#556987]">
                    President & Founder at Datopian Company
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
        <Tab.List className="mt-8">
          <Tab as={Fragment}>
            {({ selected }) => (
              /* Use the `selected` state to conditionally style the selected tab. */
              <button
                className={
                  selected
                    ? "bg-[#22C55E] m-1 h-2 w-2 rounded-full"
                    : "bg-gray-100 m-1 h-2 w-2 rounded-full"
                }
              ></button>
            )}
          </Tab>
          <Tab as={Fragment}>
            {({ selected }) => (
              /* Use the `selected` state to conditionally style the selected tab. */
              <button
                className={
                  selected
                    ? "bg-[#22C55E] m-1 h-2 w-2 rounded-full"
                    : "bg-gray-100 m-1 h-2 w-2 rounded-full"
                }
              ></button>
            )}
          </Tab>
          <Tab as={Fragment}>
            {({ selected }) => (
              /* Use the `selected` state to conditionally style the selected tab. */
              <button
                className={
                  selected
                    ? "bg-[#22C55E] m-1 h-2 w-2 rounded-full"
                    : "bg-gray-100 m-1 h-2 w-2 rounded-full"
                }
              ></button>
            )}
          </Tab>
        </Tab.List>
      </Tab.Group>
    </section>
  );
}
