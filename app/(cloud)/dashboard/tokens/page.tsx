import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';
import TokensList from './tokens-list';

export default async function TokensPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const tokens = await prisma.cliToken.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          CLI Tokens
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400">
          Manage your CLI authentication tokens. These tokens allow the
          Flowershow CLI to access your account.
        </p>
      </div>

      <TokensList tokens={tokens} />
    </div>
  );
}
