import Link from "next/link.js";

interface Props {
    title: string;
    logo?: string;
    version?: string;
    url?: string;
}

export const NavTitle: React.FC<Props> = ({ title, logo, version, url }) => {
    return (
        <Link
            href={url || "/"}
            aria-label="Home page"
            className="flex items-center font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white"
        >
            {logo && (
                <img src={logo} alt={title} className="h-8 mr-1 fill-white" />
            )}
            {title && <span>{title}</span>}
            {version && (
                <span className="inline-flex items-center rounded-full bg-gray-50 ml-2 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    {version}
                </span>
            )}
        </Link>
    );
};
