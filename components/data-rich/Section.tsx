import clsx from "clsx";

export function Section({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section className={clsx("mt-24 md:mt-36", className)} {...props}>
      {children}
    </section>
  );
}
