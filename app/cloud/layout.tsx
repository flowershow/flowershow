import CloudProviders from "./providers";

import "@/styles/dashboard.css";

export default async function CloudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CloudProviders>{children}</CloudProviders>;
}
