import { Button } from "@/components/button";

export function CTASection() {
  return (
    <div className="relative w-full overflow-hidden bg-black bg-custom-radial py-20 text-black">
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Support Us While We Build!
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-xl leading-8">
          Help us grow with your support! Your contribution will help us
          continue developing and enhancing our service, so we can offer you
          even more value in the future. You can donate as little as $1 to
          support our journey.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            href="https://buy.stripe.com/aEU7t60BVemA42A7sx"
            target="_blank"
          >
            <span>Donate!</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
