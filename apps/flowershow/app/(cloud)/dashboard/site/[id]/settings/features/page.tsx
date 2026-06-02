import { redirect } from 'next/navigation';

export default async function FeaturesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/site/${id}/settings#features`);
}
