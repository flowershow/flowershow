import { ReactNode } from "react";
import { SyncProvider } from "./sync-provider";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SyncProvider>
      <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
        <div className="flex flex-col space-y-6">{children}</div>
      </div>
    </SyncProvider>
  );
}
