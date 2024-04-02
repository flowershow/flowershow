import { Heading } from "@/components/heading";
import { CodeWindow } from "./CodeWindow";
import type { CodeSnippet } from "./CodeWindow";

type Step = {
  id: string;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  snippets?: CodeSnippet[];
};

export function QuickStart() {
  return (
    <>
      <Heading
        id="quick-start"
        heading="Quickstart"
        subheading="Start creating data-rich stories in just a few steps"
      />
      <div className="space-y-16 pt-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex flex-col-reverse lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8"
          >
            <div className="mt-6 lg:col-span-5 lg:mt-0 xl:col-span-4">
              <h3 className="text-lg font-bold text-orange-400">
                {step.title}
              </h3>
              <p className="mt-2 text-gray-500">{step.description}</p>
            </div>
            <div className="flex-auto lg:col-span-7 xl:col-span-8">
              {step.snippets ? (
                <CodeWindow snippets={step.snippets} />
              ) : (
                <div className="rounded-lg bg-gray-100">
                  <img
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    className="rounded-md border border-gray-100 object-cover object-center"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* <div className="mt-20 flex items-center justify-center gap-x-6">
                <Button href="https://datarich-demo.datahub.io/posts/story1">
                    <span>Read full tutorial</span>
                </Button>
            </div> */}
    </>
  );
}

const steps: Step[] = [
  {
    id: "1",
    title: "1. CHOOSE YOUR REPO",
    description:
      "Create or update some markdown files and push them to GitHub. You can create a new GitHub repository or use an existing one.",
    snippets: [
      {
        file: "blog.md",
        language: "markdown",
        code: `---
title: My Data-Rich Blog Post
authors: [Jane Doe]
date: "2023-11-30"
---

## Welcome to My First Data-Rich Blog Post

This is my first blog post. I'm so excited to try publishing it with DataHub!
`,
      },
    ],
  },
  {
    id: "2",
    title: "2. ADD VISUALS",
    description:
      "Enhance your content with some data visualizations. Easily add line charts, tables, maps, and more directly into your content.",
    snippets: [
      {
        file: "blog.md",
        language: "markdown",
        code: `---
title: My Data-Rich Blog Post
authors: [Jane Doe]
date: "2023-11-30"
---

## Welcome to My First Data-Rich Blog Post

This is my first blog post. I'm so excited to try publishing it with DataHub!

<LineChart
  data={[
    ["1850", -0.41765878],
    ["1851", -0.2333498],
    ["1852", -0.22939907],
    ["1853", -0.27035445],
    ["1854", -0.29163003],
  ]}
/>

`,
      },
    ],
  },
  {
    id: "3",
    title: "3. PUBLISH & SHARE",
    description:
      "Push to GitHub, then use DataHub Cloud to bring your site to life instantly. Congrats, your repository is now a beautiful site that keeps your audience captivated!",
    imageSrc: "/example.png",
    imageAlt: "Example of a rendered blog post",
  },
];
