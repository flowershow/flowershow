"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { NavMobile } from "./nav-mobile";
import { NavItem } from "./nav-item";
import { NavTitle } from "./nav-title";
import { NavSocial } from "./nav-social";


export interface NavLink {
    name: string;
    href: string;
}

export type SocialPlatform = "github" | "discord";

export interface SocialLink {
    label: SocialPlatform;
    href: string;
}

export interface NavConfig {
    title: string;
    links: Array<NavLink>;
    logo?: string;
    version?: string;
    social?: Array<SocialLink>;
    url?: string;
}

interface Props extends NavConfig, React.PropsWithChildren {}

export const Nav: React.FC<Props> = ({
    title,
    links,
    logo,
    version,
    social,
    url
}) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        function onScroll() {
            setIsScrolled(window.scrollY > 0);
        }
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    return (
        <div
            className={clsx(
                "sticky top-0 z-50 w-full",
                isScrolled && "bg-white shadow-sm"
            )}
        >            <div className="h-[4rem] flex flex-col justify-center max-w-8xl mx-auto p-4 md:px-8">
                <nav className="flex justify-between">
                    {/* Mobile navigation  */}
                    <div className="mr-2 sm:mr-4 flex lg:hidden">
                        <NavMobile links={links} />
                    </div>
                    {/* Non-mobile navigation */}
                    <div className="flex flex-none items-center">
                        <NavTitle title={title} logo={logo} version={version} url={url} />
                        {links && (
                            <div className="hidden lg:flex ml-8 mr-6 sm:mr-8 md:mr-0">
                                {links.map((link) => (
                                    <NavItem link={link} key={link.name} />
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Search field and social links */}
                    <div className="relative flex items-center basis-auto justify-end gap-6 xl:gap-8 md:shrink w-full">
                        {social && <NavSocial links={social} />}
                    </div>
                </nav>
            </div>
        </div>
    );
};
