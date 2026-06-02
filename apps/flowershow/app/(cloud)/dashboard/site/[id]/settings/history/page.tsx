import { redirect } from 'next/navigation';

export default async function HistoryPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/site/${id}/history`);
}
