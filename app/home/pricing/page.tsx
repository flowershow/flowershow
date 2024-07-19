/* eslint-disable react/no-unescaped-entities */
import { Hero } from "@/components/hero";
import { CTASection } from "./_components/CTASection";
import Link from "next/link";
import { Heading } from "@/components/heading";

export default function PricingPage() {
  return (
    <>
      <div className="mx-auto mb-[40px]  max-w-8xl px-4 pt-8 md:px-8 lg:px-[8rem]">
        <div className="relative isolate overflow-hidden text-center">
          <div className="mx-auto  px-6 lg:px-8">
            <Heading
              id="comming-soon"
              heading="Comming soon..."
              subheading="We're On It!"
            />
            <p className="max-w- mx-auto mb-[40px] max-w-[650px] text-center text-lg leading-8 text-primary">
              Thank you for your interest in our service. We're currently
              finalizing our pricing model to ensure you get the best value and
              experience.
            </p>
            <div className="mx-auto mt-6 grid  grid-cols-1 gap-x-8 gap-y-16 lg:mx-auto lg:mt-10 lg:grid-cols-1">
              <div className=" text-base  text-gray-700 ">
                <ul
                  role="list"
                  className="  flex flex-col gap-8 text-gray-600 lg:flex-row"
                >
                  <li className="py-1 lg:w-[33%]">
                    <span>
                      <strong className="bold mb-2 mt-6 block text-lg font-bold text-slate-900">
                        Enjoy Premium Features, On Us!
                      </strong>{" "}
                      While we perfect our pricing, enjoy all premium features
                      for free! Explore and take full advantage of everything we
                      offer.
                    </span>
                  </li>
                  <li className="py-1 lg:w-[33%]">
                    <span>
                      <strong className="bold mb-2 mt-6 block text-lg font-bold text-slate-900">
                        We’d Love Your Feedback
                      </strong>{" "}
                      Your feedback is invaluable. Share your thoughts and
                      suggestions on{" "}
                      <Link
                        className="text-orange-400 underline"
                        href="https://discord.com/invite/KrRzMKU"
                        target="_blank"
                      >
                        Discord
                      </Link>{" "}
                      to help us tailor our pricing plan to your needs.
                    </span>
                  </li>
                  <li className="py-1 lg:w-[33%]">
                    <span>
                      <strong className="bold mb-2 mt-6 block text-lg font-bold text-slate-900">
                        What’s Next?
                      </strong>{" "}
                      Our pricing plan will be announced soon. Stay tuned for
                      updates and feel free to reach out with any questions.
                      Thank you for being part of our community!
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CTASection />
    </>
  );
}
