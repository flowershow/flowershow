/* eslint-disable react/no-unescaped-entities */
import { Metadata } from "next";
import Link from "next/link";

import { CTASection } from "@/components/CTA-section";
import { Heading } from "@/components/heading";
import { Container } from "@/components/container";
import { Section } from "@/components/section";
import { env } from "@/env.mjs";

export const metadata: Metadata = {
  title: "DataHub Cloud Pricing",
  description: "DataHub Cloud Premium plan is coming soon.",
  icons: ["/favicon.ico"],
  openGraph: {
    title: "DataHub Pricing",
    description: "DataHub Cloud Premium plan is coming soon.",
    type: "website",
    url: `${env.NEXT_PUBLIC_ROOT_DOMAIN}/pricing`,
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 627,
        alt: "Thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataHub Pricing",
    description: "DataHub Pricing is coming soon",
    images: [
      {
        url: "/thumbnail.png",
        width: 800,
        height: 418,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
  },
};

export default function PricingPage() {
  return (
    <>
      <div className="mt-12 md:mt-24">
        <Container className="text-center">
          <Heading
            id="coming-soon"
            heading="Coming soon..."
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
                    While we perfect our pricing, enjoy all premium features for
                    free! Explore and take full advantage of everything we
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
                    updates and feel free to reach out with any questions. Thank
                    you for being part of our community!
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </div>
      <Section>
        <CTASection
          title="Support Us While We Build"
          description="Help us grow with your support! Your contribution will help us continue developing and enhancing our service, so we can offer you even more value in the future. You can donate as little as $1 to support our journey."
          linkText="Donate!"
          linkUrl="https://buy.stripe.com/aEU7t60BVemA42A7sx"
          filled
        />
      </Section>
    </>
  );
}
