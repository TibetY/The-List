import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
import { Box, ThemeProvider } from '@mui/material';
import { createSupabaseServerClient } from '~/supabase.server';
import { getPendingInvites } from '~/services/lists.server';
import InvitesDialog from '~/components/InvitesDialog';
import { makeListTheme } from '~/listTheme';
import type { ListInvite } from '~/types/restaurant';

type LoaderData = { invites: ListInvite[] };

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const invites = await getPendingInvites(supabase);
  return json<LoaderData>({ invites }, { headers });
};

export default function InvitesPage() {
  const { invites } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const theme = makeListTheme('light');

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <InvitesDialog
          open
          invites={invites}
          onClose={() => navigate('/dashboard')}
          onChanged={() => revalidator.revalidate()}
        />
      </Box>
    </ThemeProvider>
  );
}
