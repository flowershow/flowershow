import { Button } from "@/components/button";
import { env } from "@/env.mjs";

export function CTASection() {
  const CTAhref: string = (() => {
    let url = "";
    if (env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
      url = `https://staging-cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
    } else {
      url = `http://cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
    }
    return url;
  })();

  return (
    <div className="relative w-full overflow-hidden bg-custom-radial py-20 text-black">
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-6xl">
          Get Started for Free
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-xl leading-8">
          Join our Beta community and shape the future of DataHub Cloud with
          your feedback.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button href={CTAhref}>
            <span>Get started for free</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
