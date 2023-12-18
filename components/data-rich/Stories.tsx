'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Tab } from '@headlessui/react'
import clsx from 'clsx'

const features = [
    {
        title: 'Blog',
        description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec accumsan ac mauris ut blandit.",
        image: "/demo-3.png"
    },
    {
        title: 'Digital garden',
        description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec accumsan ac mauris ut blandit.",
        image: "/demo-3.png"
    },
    {
        title: 'File index',
        description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec accumsan ac mauris ut blandit.",
        image: "/demo-3.png"
    },
    {
        title: 'Airtable/Notion alternative',
        description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec accumsan ac mauris ut blandit.",
        image: "/demo-3.png"
    },
]

export function Stories() {
    let [tabOrientation, setTabOrientation] = useState<'horizontal' | 'vertical'>(
        'vertical',
    )

    /* useEffect(() => {
*     let lgMediaQuery = window.matchMedia('(min-width: 1024px)')

*     function onMediaQueryChange({ matches }: { matches: boolean }) {
*         setTabOrientation(matches ? 'vertical' : 'horizontal')
*     }

*     onMediaQueryChange(lgMediaQuery)
*     lgMediaQuery.addEventListener('change', onMediaQueryChange)

*     return () => {
*         lgMediaQuery.removeEventListener('change', onMediaQueryChange)
*     }
* }, []) */

    return (
        <section
            id="stories"
            aria-label="User stories"
            className="relative overflow-hidden bg-blue-600 pb-28 pt-20 sm:py-32 rounded-md"
        >
            <Image
                className="absolute left-1/2 top-1/2 max-w-none translate-x-[-44%] translate-y-[-42%]"
                src="/bg4.jpg"
                alt=""
                width={2245}
                height={1636}
                unoptimized
            />
            <div className="relative">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">How MarkdownDB fits your world</h2>
                    <p className="mt-6 text-lg leading-8 text-slate-200">
                        We&apos;re building MarkdownDB to help you create...
                    </p>
                </div>
                <Tab.Group
                    as="div"
                    className="mt-16 grid grid-cols-1 items-center gap-y-2 pt-10 sm:gap-y-6 md:mt-20 lg:grid-cols-12 lg:pt-0"
                    vertical={tabOrientation === 'vertical'}
                >
                    {({ selectedIndex }) => (
                        <>
                            <div className="-mx-4 flex overflow-x-auto pb-4 sm:mx-0 sm:overflow-visible sm:pb-0 lg:col-span-5">
                                <Tab.List className="relative z-10 flex gap-x-4 whitespace-nowrap px-4 sm:mx-auto sm:px-0 lg:mx-0 lg:block lg:gap-x-0 lg:gap-y-1 lg:whitespace-normal">
                                    {features.map((feature, featureIndex) => (
                                        <div
                                            key={feature.title}
                                            className={clsx(
                                                'group relative rounded-full px-4 py-1 lg:rounded-l-xl lg:rounded-r-none lg:p-6',
                                                selectedIndex === featureIndex
                                                    ? 'bg-white lg:bg-white/10 lg:ring-1 lg:ring-inset lg:ring-white/10'
                                                    : 'hover:bg-white/10 lg:hover:bg-white/5',
                                            )}
                                        >
                                            <h3>
                                                <Tab
                                                    className={clsx(
                                                        'font-display text-lg ui-not-focus-visible:outline-none',
                                                        selectedIndex === featureIndex
                                                            ? 'text-secondary lg:text-white'
                                                            : 'text-slate-100 hover:text-white lg:text-white',
                                                    )}
                                                >
                                                    <span className="absolute inset-0 rounded-full lg:rounded-l-xl lg:rounded-r-none" />
                                                    {feature.title}
                                                </Tab>
                                            </h3>
                                            <p
                                                className={clsx(
                                                    'mt-2 hidden text-sm lg:block',
                                                    selectedIndex === featureIndex
                                                        ? 'text-white'
                                                        : 'text-blue-100 group-hover:text-white',
                                                )}
                                            >
                                                {feature.description}
                                            </p>
                                        </div>
                                    ))}
                                </Tab.List>
                            </div>
                            <Tab.Panels className="lg:col-span-7">
                                {features.map((feature) => (
                                    <Tab.Panel key={feature.title} unmount={false}>
                                        <div className="relative sm:px-6 lg:hidden">
                                            <div className="absolute -inset-x-4 bottom-[-4.25rem] top-[-6.5rem] bg-white/10 ring-1 ring-inset ring-white/10 sm:inset-x-0 sm:rounded-t-xl" />
                                            <p className="relative mx-auto max-w-2xl text-base text-white sm:text-center">
                                                {feature.description}
                                            </p>
                                        </div>
                                        <div className="mt-10 w-[45rem] overflow-hidden rounded-xl bg-slate-50 shadow-xl shadow-blue-900/20 sm:w-auto lg:mt-0 lg:w-[67.8125rem]">
                                            <Image
                                                className="w-full"
                                                src={feature.image}
                                                width={600}
                                                height={400}
                                                alt=""
                                                priority
                                                sizes="(min-width: 1024px) 67.8125rem, (min-width: 640px) 100vw, 45rem"
                                                unoptimized
                                            />
                                        </div>
                                    </Tab.Panel>
                                ))}
                            </Tab.Panels>
                        </>
                    )}
                </Tab.Group>
            </div>
        </section>
    )
}
