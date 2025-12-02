import { ReactNode } from "react";
import { SyncStatusProvider } from "./sync-status-provider";

export default async function SiteLayout(
  props: {
    children: ReactNode;
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  return (
    <SyncStatusProvider siteId={params.id}>
      <div className="flex flex-col space-y-12 py-8">
        <div className="flex flex-col space-y-6">{children}</div>
      </div>
    </SyncStatusProvider>
  );
}
