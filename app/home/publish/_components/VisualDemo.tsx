"use client";
import { useEffect } from "react";

import { Container } from "@/components/container";

export function VisualDemo() {
  useEffect(() => {
    const videoElement = document.getElementById(
      "datahub-cloud-demo-video",
    ) as HTMLVideoElement;
    videoElement?.play();
  }, []);

  return (
    <Container>
      <h2 className="mt-12 text-center text-lg font-bold tracking-tight dark:text-white sm:text-4xl">
        Your GitHub. Our Platform. Perfect Harmony.
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
        DataHub Cloud syncs directly with your GitHub, allowing you to manage
        and publish your markdown and/or data files where you&apos;re already
        comfortable working. Focus on your data and leave everything else to us.
      </p>
      <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-8 md:flex-nowrap">
        <div className="flex flex-col items-center rounded-lg">
          <video
            id="datahub-cloud-demo-video"
            className="h-full w-full rounded-3xl"
            autoPlay
            loop
            muted
            src="/DataHub-Cloud-Demo.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </Container>
  );
}
