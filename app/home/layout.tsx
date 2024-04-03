import { ReactNode } from "react";
import { Nav } from "@/components/home/nav";
import { Footer } from "@/components/home/footer";
import config from "@/const/config";

export default function HomeLayout({ children }: { children: ReactNode }) {
  const social = config.social.filter((s) => s.label === "discord");
  return (
    <>
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <Nav
          title={config.navbarTitle.text}
          logo={config.navbarTitle.logo}
          url={config.author.url}
          links={config.navLinks}
          social={social}
        />
        {children}

        <div className="mx-auto max-w-8xl px-4 md:px-8">
          <Footer
            links={config.footerLinks}
            author={config.author}
            social={config.social}
            description={config.description}
          />
        </div>
      </div>
    </>
  );
}
