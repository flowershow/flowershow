import { Metadata } from "next";
import { ReactNode } from "react";

import "@/styles/dashboard.css";
import clsx from "clsx";
import {
  fontBrand,
  fontDashboardBody,
  fontDashboardHeading,
} from "@/styles/fonts";
import { getConfig } from "@/lib/app-config";

const { favicon } = getConfig();

export const metadata: Metadata = {
  title: "Site authentication",
  icons: [favicon],
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={clsx(
        fontDashboardHeading.variable,
        fontDashboardBody.variable,
        fontBrand.variable,
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <div className="flex min-h-screen flex-col justify-center py-12 font-dashboard-body sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
