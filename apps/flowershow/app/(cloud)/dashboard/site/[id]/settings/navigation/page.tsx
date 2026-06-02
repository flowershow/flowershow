import { redirect } from 'next/navigation';

export default async function NavigationPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/site/${id}/settings#navigation`);
}
