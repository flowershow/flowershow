import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/server/auth';
import SitesAdminTable from './_components/sites-table';

export default async function AdminPanel() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'ADMIN') {
    notFound();
  }

  return (
    <div className="flex flex-col space-y-6">
      <SitesAdminTable />
    </div>
  );
}
