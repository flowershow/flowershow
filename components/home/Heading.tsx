import clsx from "clsx";

export function Heading({
    id,
    heading,
    subheading,
    className
}: { id: string, heading: string, subheading: string, className?: string }) {
    return (
        <div className={clsx("max-w-2xl mx-auto mb-8 text-center", className)}>
            <h2 id={id} className="text-base font-semibold leading-7 text-secondary">
                {heading}
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {subheading}
            </p>
        </div>
    )
}
