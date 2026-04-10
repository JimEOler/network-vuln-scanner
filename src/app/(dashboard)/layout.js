import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header username={session.username} />
      <TabNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
