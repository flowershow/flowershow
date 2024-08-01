import Link from "next/link";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { DiscordIcon } from "./icons/discord";
import { AuthorConfig, FooterLink, SocialLink, SocialPlatform } from "./types";
import clsx from "clsx";
import defaultConfig from "@/const/config";
import Image from "next/image";

const icon: { [K in SocialPlatform]: React.FC<any> } = {
  discord: DiscordIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
};

const AuthorInfo = ({ logo, name, url }: AuthorConfig) => {
  const Element = url ? "a" : "span";
  return (
    <Element
      {...(url ? { href: url } : {})}
      className="flex items-center gap-1 font-semibold no-underline"
    >
      {logo && (
        <Image
          width={24}
          height={24}
          className="mx-1 h-6"
          src={logo}
          alt={`${name} Logo`}
        />
      )}
      {name}
    </Element>
  );
};

export default function Footer({
  author,
  links,
  social,
  description,
}: {
  author?: AuthorConfig | null;
  links?: Array<FooterLink>;
  social?: Array<SocialLink>;
  description?: string;
}) {
  return (
    <footer className="bg-background" aria-labelledby="footer-heading">
      <p id="footer-heading" className="sr-only">
        Footer
      </p>

      <div className="mx-auto px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div
          className={clsx(
            links && links.length > 0 && "lg:grid lg:grid-cols-3 lg:gap-10",
          )}
        >
          <div className="space-y-8">
            {author?.name && (
              <div className="flex gap-1 " data-testid="created-by">
                <span>Created by </span>
                <AuthorInfo name={author.name} url={author.url} logo="" />
              </div>
            )}
            <Link href="https://datahub.io" className="inline-flex">
              Built with{" "}
              <Image
                width={24}
                height={24}
                className="mx-2 h-6"
                src={defaultConfig.author.logo}
                alt="DataHub Logo"
              />
              DataHub
            </Link>
            {description && (
              <p className="text-sm leading-6 text-gray-600">{description}</p>
            )}
            {social && (
              <div className="flex space-x-6">
                {social.map((item) => {
                  const Icon = icon[item.label];
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">{item.label}</span>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {links && links.length > 0 && (
            <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-2 lg:mt-0">
              {links.map((link) => {
                return (
                  <div key={link.name} className="mt-10 md:mt-0">
                    <h3 className="text-sm font-semibold leading-6 text-gray-900">
                      {link.name}
                    </h3>
                    <ul role="list" className="mt-6 space-y-4">
                      {link.subItems.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className="text-sm leading-6 text-gray-600 hover:text-gray-900"
                          >
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-8 border-t border-gray-900/10 pt-8 sm:mt-10 lg:mt-12">
          <p className="text-xs leading-5 text-gray-500">
            &copy; 2024 All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
