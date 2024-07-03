import Link from "next/link.js";

interface Props {
  title?: string;
  logo?: string;
  version?: string;
  url?: string;
}

export const NavTitle: React.FC<Props> = ({ title, logo, version, url }) => {
  return (
    <Link
      data-testid="nav-title"
      href={url || "/"}
      aria-label="Home page"
      className="sticky top-0 z-10 flex items-center space-x-2 bg-white pb-[10px] text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl"
    >
      {logo && <img src={logo} alt="" className="mr-1 h-8 fill-white" />}
      {title && <span>{title}</span>}
      {version && (
        <span className="ml-2 inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {version}
        </span>
      )}
    </Link>
  );
};
