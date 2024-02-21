import Image from "next/image";
import { Button } from "@/components/common/Button";

export function CTASection() {
  return (
    <div className="relative w-full overflow-hidden py-20">
      <Image
        className="absolute left-1/2 top-1/2 max-w-none translate-x-[-44%] translate-y-[-42%]"
        src="/bg4.jpg"
        alt=""
        width={2245}
        height="100"
        unoptimized
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Get early dibs on DataHub Cloud!
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary">
          Hop on our waitlist, and you&apos;ll be the first to know when
          it&apos;s ready to roll out. Get early access, special offers, and a
          chance to shape our product.{" "}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button href="https://tally.so/r/wad1O2">
            <span>Sign up for free for early access</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
