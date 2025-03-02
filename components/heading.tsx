import clsx from "clsx";

export function Heading({
  id,
  heading,
  subheading,
  accentColor,
  className,
}: {
  id: string;
  heading: string;
  subheading: string;
  accentColor?: string;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto mb-8 max-w-2xl text-center", className)}>
      <h2
        id={id}
        className={clsx(
          "text-base font-semibold uppercase leading-7",
          accentColor ? `text-${accentColor}` : "text-secondary",
        )}
      >
        {heading}
      </h2>
      <p className="mt-2 text-3xl font-bold tracking-tight text-primary-strong sm:text-4xl">
        {subheading}
      </p>
    </div>
  );
}
