import Library from '@app/components/Library';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const LibraryPage: NextPage = () => {
  useRouteGuard([Permission.MANAGE_REQUESTS, Permission.RECENT_VIEW], {
    type: 'or',
  });
  return <Library />;
};

export default LibraryPage;
