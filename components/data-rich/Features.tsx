import { DocumentTextIcon, RectangleStackIcon } from "@heroicons/react/24/outline"
import { Heading } from '@/components/common/Heading'

const features = [
    {
        name: 'Simple syntax:',
        description: "Simply markdown with some cool extra features.",
        icon: DocumentTextIcon,
    },
    {
        name: 'Elegnat data visualisations:',
        description: "Enrich your stories with charts, maps, and more.",
        icon: DocumentTextIcon,
    },
    {
        name: 'Instant publishing:',
        description: "Publish in just a few clicks with DataHub.",
        icon: DocumentTextIcon,
    },
    {
        name: 'Always up to date:',
        description: "Your site's content is always up to date with the latest changes in the repo.",
        icon: DocumentTextIcon,
    },
    {
        name: 'No vendor lock-in:',
        description: "The content and data is always only yours. Check it in to git and deploy with DataHub.",
        icon: RectangleStackIcon,
    },
]

export function Features() {
    return (
        <>
            <Heading
                id="features"
                heading="Features"
                subheading="Key features"
            />
            <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-primary dark:text-primary-dark leading-7 text-gray-500 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:gap-x-16">
                {features.map((feature) => (
                    <div key={feature.name} className="relative pl-9">
                        <dt className="inline font-semibold text-slate-900 dark:text-slate-100">
                            <span className="absolute left-1 top-1 h-5 w-5 text-secondary">
                                <feature.icon aria-hidden />
                            </span>
                            {feature.name}
                        </dt>{' '}
                        <dd className="inline">{feature.description}</dd>
                    </div>
                ))}
            </dl>
        </>
    )
}
