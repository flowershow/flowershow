import { redirect } from 'next/navigation';

export default async function AppearancePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/site/${id}/settings#appearance`);
}
