import { redirect } from 'next/navigation';

export default async function IntegrationsRedirect(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  redirect(`/site/${decodeURIComponent(params.id)}/settings/github`);
}
