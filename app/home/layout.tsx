import { ReactNode } from "react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import config from "@/const/config";
import Link from "next/link";
import { env } from "@/env.mjs";

export default function HomeLayout({ children }: { children: ReactNode }) {
  const social = config.social.filter((s) => s.label === "discord");

  const signInLink: string = (() => {
    let url = "";
    if (env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
      url = `https://staging-cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
    } else {
      url = `http://cloud.${env.NEXT_PUBLIC_ROOT_DOMAIN}/login`;
    }
    return url;
  })();

  return (
    <>
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <Nav
          title={config.navbarTitle.text}
          logo={config.navbarTitle.logo}
          url={config.author.url}
          links={config.navLinks}
          social={social}
        >
          <Link
            href={signInLink}
            className="border-l-2 pl-6 text-sm font-medium text-slate-500 hover:text-slate-600"
          >
            DataHub Cloud Login
          </Link>
        </Nav>
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
