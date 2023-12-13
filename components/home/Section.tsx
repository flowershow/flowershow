import clsx from 'clsx'


export function Section({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<'section'>) {
    return (
        <section
            className={clsx("mx-auto max-w-2xl px-6 lg:max-w-none mt-24 md:mt-36", className)}
            {...props}
        >
            {children}
        </section>
    )
}
