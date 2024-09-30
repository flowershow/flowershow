"use client";
import { useEffect, useState } from "react";
import { GithubIcon } from "lucide-react";

import { Heading } from "@/components/heading";
import { Container } from "@/components/container";
import { DiscordIcon } from "@/components/icons/discord";
import { fetchGitHubRepo, fetchGitHubRepoContributors } from "@/lib/github";
import config from "@/const/config";

const Stat = ({ title, value, ...props }) => {
  return (
    <div {...props}>
      <span className="text-4xl font-bold text-cyan-500 sm:text-6xl">
        {value}
      </span>
      <p className="text-lg font-medium">{title}</p>
    </div>
  );
};

const IconButton = ({ Icon, text, href, ...props }) => {
  return (
    <div {...props}>
      <a
        className="flex items-center rounded border border-cyan-500 px-5 py-3 text-primary transition-all duration-200 hover:bg-cyan-500 hover:text-white dark:text-primary-dark dark:hover:text-primary"
        href={href}
      >
        <Icon className="mr-2 h-6 w-6" />
        {text}
      </a>
    </div>
  );
};

export function Community() {
  const [starsCount, setStarsCount] = useState<number>();
  const [contributorsCount, setContributorsCount] = useState<number>();

  useEffect(() => {
    fetchGitHubRepo({
      gh_repository: config.github,
    }).then((data) => {
      setStarsCount(data.stargazers_count);
    });
    fetchGitHubRepoContributors({
      gh_repository: config.github,
    }).then((data) => {
      setContributorsCount(data.length);
    });
  }, []);

  return (
    <Container>
      {/* TODO better way to change accent color? */}
      <Heading
        id="community"
        heading="Community"
        subheading="Get in touch or become a contributor!"
        accentColor="cyan-500"
      />
      <div className="mt-12 flex justify-center">
        <Stat title="Stars on GitHub" value={starsCount} className="mr-10" />
        <Stat title="Contributors" value={contributorsCount} />
      </div>
      <div className="mt-12 flex flex-wrap justify-center">
        <IconButton
          Icon={GithubIcon}
          text="Star on GitHub"
          href={config.github}
          className="mb-4 w-full sm:mr-4 sm:w-auto"
        />
        <IconButton
          Icon={DiscordIcon}
          text="Join the Discord server"
          href={config.discord}
          className="mb-4 w-full sm:mr-4 sm:w-auto"
        />
      </div>
    </Container>
  );
}

export const revalidate = 3600; // revalidate at most every hour
