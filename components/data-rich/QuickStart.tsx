import { Button } from '@/components/common/Button';
import { Heading } from '@/components/common/Heading';
import { CodeWindow } from '@/components/data-rich/CodeWindow';
import type { CodeSnippet } from '@/components/data-rich/CodeWindow';

type Step = {
    id: string
    title: string
    description: string
    imageSrc?: string
    imageAlt?: string
    snippets?: CodeSnippet[]
}


export function QuickStart() {
    return (
        <>
            <Heading
                id="quick-start"
                heading="Quickstart"
                subheading="Start creating data-rich stories in just a few steps"
            />
            <div className="pt-6 space-y-16">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className="flex flex-col-reverse lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8"
                    >
                        <div className="mt-6 lg:col-span-5 lg:mt-0 xl:col-span-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                {step.title}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">{step.description}</p>
                        </div>
                        <div className="flex-auto lg:col-span-7 xl:col-span-8">
                            {step.snippets ? (
                                <CodeWindow snippets={step.snippets} />
                            ) : (
                                <div className="rounded-lg bg-gray-100">
                                    <img src={step.imageSrc} alt={step.imageAlt} className="object-cover object-center border border-gray-100 rounded-md" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-20 flex items-center justify-center gap-x-6">
                <Button href="/blog/basic-tutorial">
                    <span>Read full tutorial</span>
                </Button>
            </div>
        </>
    )
}

const steps: Step[] = [
    {
        id: '1',
        title: 'Create some markdown files and push them to GitHub',
        description:
            'You can create a new GitHub repository or use an existing one. Just make sure to set its visibility to `public`.',
        snippets: [
            {
                file: "blog.md",
                language: "markdown",
                code: `---
title: My Data-Rich Blog Post
authors: [Jane Doe]
date: "2023-11-30"
layout: blog
---

## Welcome to My First Data-Rich Blog Post

This is my first blog post. I'm so excited to try publishing it with DataHub!
`,
            }
        ]
    },
    {
        id: '2',
        title: 'Enhance your content with some data visualizations',
        description:
            'We support line charts, tables, maps, and more!',
        snippets: [
            {
                file: "blog.md",
                language: "markdown",
                code: `---
title: My Data-Rich Blog Post
authors: [Jane Doe]
date: "2023-11-30"
layout: blog
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
            }
        ]
    },
    {
        id: '3',
        title: 'Publish with DataHub',
        description:
            'Remember to first push your changes to GitHub! Then, go to https://cloud.flowershow.app/, sign up and create a new site.',
        imageSrc: "/rendered-example.png",
        imageAlt: "Example of a rendered blog post"
    },
]
