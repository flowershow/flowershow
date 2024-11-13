import { Button } from "@/components/button";
import { Container } from "@/components/container";
import clsx from "clsx";

export function CTASection({
  title,
  description,
  filled = false,
  subtitle,
  linkText,
  linkUrl,
  children,
  ...props
}: {
  title: string;
  description: string;
  filled?: boolean;
  subtitle?: string;
  linkText?: string;
  linkUrl?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      {...props}
      className={clsx(
        "py-20 text-center text-black",
        filled ? "bg-custom-radial" : "bg-white",
      )}
    >
      <Container>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-4 text-xl sm:text-2xl">{subtitle}</p>}
        <p className="mx-auto mt-6 max-w-4xl text-xl leading-8">
          {description}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          {children ?? (
            <Button href={linkUrl}>
              <span>{linkText}</span>
            </Button>
          )}
        </div>
      </Container>
    </div>
  );
}
