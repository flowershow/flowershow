import Image from "next/image";
import { Button } from "@/components/common/Button";

export function CTASection() {
    return (
        <div
            className="relative overflow-hidden py-20 px-6 rounded-md"
        >
            <Image
                className="absolute left-1/2 top-1/2 max-w-none translate-x-[-44%] translate-y-[-42%]"
                src="/bg4.jpg"
                alt=""
                width={2245}
                height="100"
                unoptimized
            />
            <div className="relative mx-auto max-w-3xl text-center">
                <h2 className="mt-2 text-3xl text-primary font-bold tracking-tight sm:text-4xl">
                    Start creating your data-rich documents today.
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary">
                    Check out our tutorial and learn the basics of creating and publishing data-rich documents.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Button href="/docs/datarich-story-tutorial">
                        <span>Read tutorial</span>
                    </Button>
                </div>

            </div>
        </div>
    )
}
