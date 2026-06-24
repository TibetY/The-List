import { useState } from 'react';
import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  ThemeProvider,
} from '@mui/material';
import { PhotoCamera, ArrowBack } from '@mui/icons-material';
import { createSupabaseServerClient } from '~/supabase.server';
import { getProfile } from '~/services/profiles.server';
import { updateProfile, uploadAvatar } from '~/services/profiles.client';
import { makeListTheme } from '~/listTheme';
import type { Profile } from '~/types/restaurant';

type LoaderData = { userId: string; profile: Profile | null };

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const profile = await getProfile(supabase, user.id);
  return json<LoaderData>({ userId: user.id, profile }, { headers });
};

export default function ProfilePage() {
  const { userId, profile } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const theme = makeListTheme('light');

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [preview, setPreview] = useState(profile?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let url = avatarUrl;
      if (avatarFile) {
        url = await uploadAvatar(avatarFile, userId);
        setAvatarUrl(url);
      }
      await updateProfile(userId, { displayName: displayName.trim(), avatarUrl: url });
      setSnackbar({ open: true, message: 'Profile saved!', severity: 'success' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setSnackbar({ open: true, message: 'Failed to save profile.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', fontFamily: "'DM Sans',sans-serif" }}>
        <Container maxWidth="sm" sx={{ pt: { xs: 6, sm: 10 }, pb: 8 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            Back to dashboard
          </Button>

          <Typography
            variant="h4"
            component="h1"
            sx={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, mb: 4 }}
          >
            Your profile
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Avatar src={preview} alt="Your profile photo" sx={{ width: 88, height: 88, fontSize: 32 }}>
              {(displayName?.[0] ?? '?').toUpperCase()}
            </Avatar>
            <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
              {preview ? 'Change photo' : 'Upload photo'}
              <input type="file" hidden accept="image/*" onChange={handleFile} aria-label="Upload avatar" />
            </Button>
          </Box>

          <TextField
            fullWidth
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ minWidth: 140 }}
          >
            {saving ? <CircularProgress size={22} color="inherit" /> : 'Save changes'}
          </Button>
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
