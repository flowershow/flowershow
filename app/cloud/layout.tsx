import clsx from "clsx";

import CloudProviders from "./providers";

import { fontDashboardHeading, fontDashboardBody } from "@/styles/fonts";
import "@/styles/dashboard.css";

export default async function CloudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        fontDashboardHeading.variable,
        fontDashboardBody.variable,
      )}
    >
      <CloudProviders>{children}</CloudProviders>
    </div>
  );
}
