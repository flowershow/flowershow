import { Button } from "@/components/button";

export function CTASection() {
  return (
    <div className="relative w-full overflow-hidden bg-custom-radial py-20 text-black">
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mt-2 text-6xl font-bold tracking-tight sm:text-4xl">
          Get Started for Free
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-xl leading-8">
          Join our Beta community and shape the future of DataHub Cloud with
          your feedback.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button href="https://cloud.datahub.io/" target="_blank">
            <span>Get started for free</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
