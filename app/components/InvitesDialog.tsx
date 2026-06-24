import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { ListInvite } from '~/types/restaurant';
import { acceptInvite, declineInvite } from '~/services/lists.client';

interface InvitesDialogProps {
  open: boolean;
  invites: ListInvite[];
  onClose: () => void;
  onChanged: () => void;
}

export default function InvitesDialog({
  open,
  invites,
  onClose,
  onChanged,
}: InvitesDialogProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="invites-dialog-title"
    >
      <DialogTitle
        id="invites-dialog-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
        }}
      >
        Invitations
        <IconButton onClick={onClose} aria-label="Close" sx={{ color: 'text.secondary' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        )}
        {invites.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
            No pending invitations.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {invites.map((inv) => (
              <Box key={inv.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {inv.listName}
                  </Typography>
                  <Chip size="small" label={inv.role} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Invited by {inv.invitedByName || 'someone'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busyId === inv.id}
                    onClick={() => run(inv.id, () => acceptInvite(inv.id))}
                  >
                    {busyId === inv.id ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      'Accept'
                    )}
                  </Button>
                  <Button
                    size="small"
                    disabled={busyId === inv.id}
                    onClick={() => run(inv.id, () => declineInvite(inv.id))}
                    sx={{ color: 'text.secondary' }}
                  >
                    Decline
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
