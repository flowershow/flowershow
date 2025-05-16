import { ReactNode } from "react";
import { SyncStatusProvider } from "./sync-status-provider";

export default function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  return (
    <SyncStatusProvider siteId={params.id}>
      <div className="flex flex-col space-y-12 py-8">
        <div className="flex flex-col space-y-6">{children}</div>
      </div>
    </SyncStatusProvider>
  );
}
