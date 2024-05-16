import Link from "next/link";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { DiscordIcon } from "@/components/icons/discord";

interface FooterLink {
  name: string;
  subItems: Array<{
    name: string;
    href: string;
  }>;
}

interface FooterSocial {
  label: "discord" | "github" | "linkedin" | "twitter";
  href: string;
}

interface AuthorConfig {
  name: string;
  url?: string;
  logo?: string;
}

interface Props {
  links: Array<FooterLink>;
  description?: string;
  author: AuthorConfig;
  social?: Array<FooterSocial>;
}

const icon = {
  discord: DiscordIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
};

export const Footer: React.FC<Props> = ({
  links,
  social,
  author,
  description,
}) => {
  return (
    <footer className="bg-background" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="border-t border-gray-900/10 pt-8">
          <div className="space-y-8">
            <p className="flex">
              Powered by{" "}
              <img className="mx-2 h-6" src={author.logo} alt="Company name" />
              DataHub
            </p>
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
            <p className="text-xs leading-5 text-gray-500">
              &copy; 2024 All rights reserved
            </p>
          </div>
          {/* <div className="mt-16 grid grid-cols-3 gap-8 xl:col-span-2 xl:mt-0">
            {links &&
              links.map((link) => {
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
          </div> */}
        </div>
      </div>
    </footer>
  );
};
