import Link from "next/link";

interface FooterLink {
  name: string;
  subItems: Array<{
    name: string;
    href: string;
  }>;
}

interface AuthorConfig {
  name: string;
  url?: string;
  logo?: string;
}

interface Props {
  author: AuthorConfig;
  links?: Array<FooterLink>;
}

// TODO replace this with some nice tailwindui footer
export const Footer: React.FC<Props> = ({ links, author }) => {
  return (
    <footer className="prose flex h-auto w-full max-w-none flex-col items-center justify-center bg-background pb-20 pt-0 dark:prose-invert dark:bg-background-dark">
      <div className="grid w-full grid-cols-1 px-14 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {links &&
          links.map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center sm:items-start"
            >
              <h3 className="inline-flex items-center pt-1 font-bold">
                {item.name}
              </h3>
              {item.subItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className="main-text inline-flex items-center pt-1 text-center !text-black no-underline sm:text-start"
                >
                  {subItem.name}
                </Link>
              ))}
            </div>
          ))}
      </div>
      <p className="flex items-center justify-center">
        Created by
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center no-underline"
        >
          {author.logo && (
            <img
              src={author.logo}
              alt={author.name}
              className="mx-2 my-0 block h-6"
            />
          )}

          {author.name}
        </a>
      </p>
    </footer>
  );
};
