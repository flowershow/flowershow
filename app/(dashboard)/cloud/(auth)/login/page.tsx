import Image from "next/image";
import { Suspense } from "react";

import LoginButton from "./login-button";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

export default function LoginPage() {
  return (
    <div className="mx-5 border border-primary-faint p-10 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md md:max-w-lg md:p-12">
      <Image
        alt={`${config.title} logo`}
        width={100}
        height={100}
        className="relative mx-auto h-12 w-auto"
        src={config.logo}
      />
      <h1 className="mt-6 text-center font-dashboard-heading text-3xl">
        {config.title}
      </h1>
      <p className="mt-2 text-center text-sm">
        Turn your markdown into a website in a couple of clicks. <br />
      </p>

      <div className="mt-4">
        <Suspense
          fallback={
            <div className="my-2 h-10 w-full rounded-md border border-primary-faint bg-primary-faint" />
          }
        >
          <LoginButton />
        </Suspense>
        <p className="mt-2 text-center text-xs">
          By registering, you agree to our
          <a
            className="font-medium hover:text-primary-subtle"
            href={config.termsOfService}
            target="_blank"
          >
            {" "}
            Terms of Service.
          </a>
        </p>
        <p className="mt-3 border-t pt-3 text-center text-xs text-primary-subtle">
          We use GitHub to securely sync your vault and markdown files with
          Flowershow for a seamless experience. No GitHub account? No
          problem—sign-up will take just a few seconds.
        </p>
      </div>
    </div>
  );
}
