"use client";
import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const faqData = [
  {
    question: "What is DataHub Cloud?",
    answer: (
      <>
        DataHub Cloud is a platform that allows you to easily publish and share
        datasets from GitHub. It converts raw data and Markdown files into
        beautifully presented, interactive sites.
      </>
    ),
  },
  {
    question: "How do I start using DataHub Cloud?",
    answer: (
      <>
        Start by linking your GitHub repository to DataHub Cloud, add data and
        edit your markdown files. Our platform processes these files to generate
        your beautifully formatted, dataset site, which you can then customize
        and publish with ease.
        <Link
          href="https://datahub.io/docs"
          className="font-bold text-orange-400"
          target="_blank"
        >
          {" "}
          Our quick start guide{" "}
          <ExternalLink className="inline-block" width={15} />
        </Link>
        provides detailed instructions on how to set this up.
      </>
    ),
  },
  {
    question: "Can I create a dataset page without coding?",
    answer: (
      <>
        Absolutely! DataHub Cloud is designed for ease of use, allowing you to
        create dataset pages using simple markdown files without any coding
        required. Our tools handle the conversion and presentation for you.
      </>
    ),
  },
  {
    question: "How many sites can I manage with DataHub Cloud?",
    answer: (
      <>
        Currently, there is no limit to the number of dataset sites you can
        create and manage with DataHub Cloud. Each GitHub repository connected
        to your account can serve as a separate site.
      </>
    ),
  },
  {
    question: "Can I use DataHub Cloud if I'm not familiar with GitHub?",
    answer: (
      <>
        Yes, you can! While familiarity with GitHub enhances your experience,
        you don’t need to be an expert. Our platform is designed to be
        user-friendly, and we provide detailed guides to help you along the way.
      </>
    ),
  },
  {
    question:
      "What types of data visualizations can I create with DataHub Cloud?",
    answer: (
      <>
        DataHub Cloud supports a variety of visualizations including line
        charts, bar charts, maps, and tables. You can enhance your datasets with
        these visuals simply by using our components. You can check them out
        <Link
          href="https://datahub.io/docs"
          className="font-bold text-orange-400"
          target="_blank"
        >
          {" "}
          here
          <ExternalLink className="inline-block" width={15} />
        </Link>
        .
      </>
    ),
  },
  {
    question:
      "How can I ensure my data remains secure when using DataHub Cloud?",
    answer: (
      <>
        Data security is our top priority. DataHub Cloud does not store your
        data - it remains within your GitHub repository. We use OAuth for
        authentication and operate with read-only access to your repositories
        unless otherwise required for functionality.
      </>
    ),
  },
  {
    question: "Is there a cost to use DataHub Cloud?",
    answer: (
      <>
        DataHub Cloud currently offers a free version that users can sign up
        for. As we develop and add more features, additional premium plans will
        be introduced.
      </>
    ),
  },
  {
    question: "What support options are available if I need help?",
    answer: (
      <>
        Our support team is ready to assist you with any questions or issues you
        might encounter. The quickest way to get help is to
        <Link
          href="https://discord.gg/ZB4j9B5gXm"
          className="font-bold text-orange-400"
          target="_blank"
        >
          {" "}
          join our community on Discord{" "}
          <ExternalLink className="inline-block" width={15} />
        </Link>
        , where you can chat directly with our team and other users.
      </>
    ),
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto mt-16 max-w-3xl">
      <h2 className="mb-4 text-2xl font-bold">FAQs</h2>
      <div className="space-y-4">
        {faqData.map((faq, index) => (
          <div key={index} className="rounded-lg border border-gray-300 p-4">
            <button
              onClick={() => toggleFAQ(index)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-lg font-medium text-primary dark:text-primary-dark">
                {faq.question}
              </span>
              <span className="ml-2 text-orange-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={clsx(
                    "h-5 w-5",
                    openIndex === index && "rotate-180",
                  )}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.707-9.707a1 1 0 011.414 0L10 10.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>
            {openIndex === index && (
              <div className="mt-2 text-gray-700 dark:text-gray-300">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
