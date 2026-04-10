import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { hasUsers } from '@/lib/store';

export default async function Home() {
  const usersExist = await hasUsers();
  if (!usersExist) {
    redirect('/setup');
  }

  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  redirect('/assets');
}
