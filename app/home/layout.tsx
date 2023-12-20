import { ReactNode } from "react";
import { Nav } from "@/components/home/nav"
import { Footer } from "@/components/home/footer"
import config from "@/const/config"


export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <div className="min-h-screen bg-background dark:bg-background-dark">
                <Nav
                    title={config.navbarTitle.title}
                    logo={config.navbarTitle.logo}
                    url={config.author.url}
                    links={config.navLinks}
                    social={config.social}
                />
                <div
                    className="max-w-8xl mx-auto px-4 md:px-8"
                >
                    <div className="mx-auto lg:px-[16rem] pt-8">
                        {children}
                    </div>

                    <Footer links={config.navLinks} author={config.author} />
                </div>
            </div>
        </>
    );
}
