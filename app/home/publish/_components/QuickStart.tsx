import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { Heading } from "@/components/heading";
import { Container } from "@/components/container";

type Step = {
  id: string;
  title: string;
  description: ReactNode;
  imageSrc: string;
  imageAlt: string;
};

const steps: Step[] = [
  {
    id: "1",
    title: "CHOOSE OR CREATE A GITHUB REPO",
    description: (
      <span>
        Whether starting fresh with a new GitHub repo or using an existing one,
        the first step is simple. Add your datasets directly to your repo. For a
        smooth start, use our{" "}
        <Link
          href="https://github.com/datahubio/datahub-cloud-template"
          className="font-bold text-orange-400"
          target="_blank"
        >
          pre-configured template{" "}
          <ExternalLink className="inline-block" width={15} />
        </Link>
      </span>
    ),
    imageSrc: "/choose-create-github-repo.svg",
    imageAlt: "CHOOSE OR CREATE A GITHUB REPO Image",
  },
  {
    id: "2",
    title: "PUBLISH IT WITH DATAHUB CLOUD",
    description: (
      <span>
        Just push your changes to GitHub. With a single click in DataHub Cloud,
        your updated site is live and ready to impress.
      </span>
    ),
    imageSrc: "/publish-with-datahub-cloud.svg",
    imageAlt: "CHOOSE OR CREATE A GITHUB REPO Image",
  },
  {
    id: "3",
    title: "ADD VISUALS (OPTIONAL)",
    description: (
      <span>
        You can enhance your page with some data visualizations. Insert line
        charts, tables, and maps directly into your content - no coding skills
        needed. Read how to{" "}
        <Link
          href="https://datahub.io/@Daniellappv/datahub-cloud-template-2/docs/Add%20visuals%20and%20data-rich%20components"
          className="font-bold text-orange-400"
          target="_blank"
        >
          add visuals and data-rich components{" "}
          <ExternalLink className="inline-block" width={15} />
        </Link>
      </span>
    ),
    imageSrc: "/add-visuals-optional.svg",
    imageAlt: "CHOOSE OR CREATE A GITHUB REPO Image",
  },
  {
    id: "4",
    title: "SHARE IT WITH THE WORLD",
    description: (
      <span>
        {" "}
        You can now share your awesome data-rich page with the world!{" "}
      </span>
    ),
    imageSrc: "/share-with-the-world.svg",
    imageAlt: "CHOOSE OR CREATE A GITHUB REPO Image",
  },
];

export function QuickStart() {
  return (
    <Container>
      <Heading
        id="quick-start"
        heading="Quickstart"
        subheading="Publish your data-rich stories in just a few steps"
      />
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center">
            <div className="mt-6 flex flex-col items-center sm:block">
              <Image
                width="1324"
                height="912"
                src={step.imageSrc}
                alt={step.imageSrc}
                className="w-[50%] sm:w-full"
              />
              <p className="font-light text-gray-600">Step {step.id}</p>
              <h3 className="mb-2 mt-6 text-lg font-bold">{step.title}</h3>
              <p className="py-1 text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
