import Link from "next/link";

import type { NavLink } from "./nav";

interface AuthorConfig {
  name: string;
  url?: string;
  logo?: string;
}

interface Props {
  author: AuthorConfig;
  links?: Array<NavLink>;
}

// TODO replace this with some nice tailwindui footer
export const Footer: React.FC<Props> = ({ links, author }) => {
  return (
    <footer className="flex flex-col items-center justify-center gap-3 bg-background px-14 pb-20 pt-16 text-primary dark:bg-background-dark dark:text-primary-dark">
      {links && (
        <div className="mb-2 flex w-full flex-wrap justify-center">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="mx-4 inline-flex items-center px-1 py-1 font-semibold text-black no-underline hover:text-primary dark:text-white hover:dark:text-primary-dark"
            >
              {/* TODO aria-current={item.current ? "page" : undefined} */}
              {item.name}
            </Link>
          ))}
        </div>
      )}
      <p className="flex items-center justify-center gap-2">
        <span>Created by</span>
        {author.url ? (
          <a
            href={author.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-black no-underline dark:text-white"
          >
            {author.logo && (
              <img src={author.logo} alt="Logo" className="block h-6" />
            )}
            <span>{author.name}</span>
          </a>
        ) : (
          <span className="flex items-center gap-1 font-semibold text-black no-underline dark:text-white">
            {author.logo && (
              <img src={author.logo} alt={author.name} className="block h-6" />
            )}
            <span>{author.name}</span>
          </span>
        )}
      </p>
      <p className="flex items-center justify-center gap-1">
        <span>Made with</span>
        <a
          href="https://flowershow.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-semibold text-black no-underline dark:text-white"
        >
          <img
            src="https://flowershow.app/images/logo.svg"
            alt="Logo"
            className="block h-6"
          />
          <span>Flowershow</span>
        </a>
      </p>
    </footer>
  );
};
