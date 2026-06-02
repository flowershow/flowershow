import { redirect } from 'next/navigation';

export default async function ContentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/site/${id}/settings#content`);
}
