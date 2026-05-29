import { type ReactNode, Suspense } from 'react';

export default async function SiteLayout(props: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { children } = props;

  return (
    <Suspense>
      <div className="flex flex-col space-y-12 py-8">
        <div className="flex flex-col space-y-6">{children}</div>
      </div>
    </Suspense>
  );
}
