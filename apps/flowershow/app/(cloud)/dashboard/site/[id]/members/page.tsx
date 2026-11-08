import { TRPCError } from '@trpc/server';
import { notFound } from 'next/navigation';
import MembersPanel, {
  type MemberActionResult,
} from '@/components/dashboard/members-panel';
import { api } from '@/trpc/server';

async function toResult(
  action: () => Promise<unknown>,
): Promise<MemberActionResult> {
  try {
    await action();
    return {};
  } catch (e) {
    if (e instanceof TRPCError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
  }
}

export default async function SiteMembersPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const siteId = decodeURIComponent(id);

  const site = await api.site.getById.query({ id: siteId });
  if (!site) notFound();
  const data = await api.siteMember.list.query({ siteId });

  const invite = async (email: string) => {
    'use server';
    return toResult(() => api.siteMember.invite.mutate({ siteId, email }));
  };
  const revokeInvite = async (inviteId: string) => {
    'use server';
    return toResult(() =>
      api.siteMember.revokeInvite.mutate({ siteId, inviteId }),
    );
  };
  const remove = async (userId: string) => {
    'use server';
    return toResult(() => api.siteMember.remove.mutate({ siteId, userId }));
  };
  const leave = async () => {
    'use server';
    return toResult(() => api.siteMember.leave.mutate({ siteId }));
  };

  return (
    <div className="mt-6 flex flex-col space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-800 dark:text-zinc-100">
          Members
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Editors can change site settings, publish and manage annotations. Only
          the owner can invite people, change billing or delete the site.
        </p>
      </div>
      <MembersPanel
        role={data.role}
        owner={data.owner}
        members={data.members}
        invites={'invites' in data ? data.invites : []}
        isPremium={site.plan === 'PREMIUM'}
        actions={{ invite, revokeInvite, remove, leave }}
      />
    </div>
  );
}
