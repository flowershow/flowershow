import { Button } from "@/components/common/Button"
/* import { CheckCircleIcon } from "@heroicons/react/24/solid" */


export function Hero() {

    return (
        <div className="relative isolate">
            <div className="mx-auto max-w-2xl py-8 sm:py-12 lg:py-14">
                {/* <div className="flex">
                        <div className="relative flex items-center gap-x-4 rounded-full px-4 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                            <span className="font-semibold text-indigo-600">We’re hiring</span>
                            <span className="h-4 w-px bg-gray-900/10" aria-hidden="true" />
                            <a href="#" className="flex items-center gap-x-1">
                                <span className="absolute inset-0" aria-hidden="true" />
                                See open positions
                                <SomeIcon className="-mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                            </a>
                        </div>
                    </div> */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                        Build elegant data-driven sites with markdown & deploy in seconds.
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        Publish datasets, data stories and data portals using markdown with a few clicks.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Button href="https://tally.so/r/wad1O2">
                            <span>Sign up for early access</span>
                        </Button>
                        <Button
                            href="https://datarich-demo.datahub.io/"
                            variant="outline"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <span>See the demo</span>
                        </Button>
                    </div>
                    <p className="mt-8">
                        Built with<span className="text-xl mx-1.5">❤</span>by
                        <a
                            href="https://www.datopian.com/"
                            rel="noopener noreferrer"
                            target="_blank"
                            className="font-medium"
                        >
                            <img
                                src="/datopian-logo-black.png"
                                alt=""
                                className="mx-1.5 mb-1.5 h-5 inline"
                            />
                            <span>
                                Datopian
                            </span>
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
