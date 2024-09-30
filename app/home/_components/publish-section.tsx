import { Container } from "@/components/container";
import { BoltIcon } from "@heroicons/react/20/solid";
import { GithubIcon, CoinsIcon } from "lucide-react";
import { MarkdownIcon } from "@/components/icons/markdown";
import { Button } from "@/components/button";

const features = [
  {
    name: "Quick and easy",
    description:
      "Publish your site in just a few clicks and make your site auto-sync with your GitHub repo.",
    icon: BoltIcon,
  },
  {
    name: "Run off-GitHub",
    description:
      "The content and data are always yours. Use GitHub to collaborate and version your content.",
    icon: GithubIcon,
  },
  {
    name: "Markdown based",
    description:
      "Simply markdown with some cool extra features and data visualisations to enhance your data stories.",
    icon: MarkdownIcon,
  },
  {
    name: "Free tier",
    description:
      "Start publishing your data for free. No credit card required.",
    icon: CoinsIcon,
  },
];

export function PublishSection() {
  return (
    <Container>
      <div className="mx-auto max-w-2xl lg:text-center">
        <h2 className="text-base font-semibold leading-7 text-orange-400">
          PUBLISH
        </h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Publish and share your Data with ease
        </p>
      </div>
      <div className="mx-auto mt-6 max-w-2xl sm:mt-12 lg:mt-16 lg:max-w-none">
        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.name} className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <feature.icon
                  aria-hidden="true"
                  className="h-5 flex-none text-orange-400"
                />
                {feature.name}
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">{feature.description}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-6 flex items-center justify-center gap-x-6 sm:mt-12 lg:mt-16">
        <Button href="/publish">Start publishing!</Button>
      </div>
    </Container>
  );
}
