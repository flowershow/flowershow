import clsx from "clsx";

export function Heading({
  id,
  heading,
  subheading,
  className,
}: {
  id: string;
  heading: string;
  subheading: string;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto mb-8 max-w-2xl text-center", className)}>
      <h2
        id={id}
        className="text-base font-semibold uppercase leading-7 text-[#8F56D7]"
      >
        {heading}
      </h2>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {subheading}
      </p>
    </div>
  );
}
