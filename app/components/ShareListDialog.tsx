import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Avatar,
  Select,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Close, PersonAdd, Delete, Mail } from '@mui/icons-material';
import type {
  ListInvite,
  ListMember,
  ListRole,
  RestaurantList,
} from '~/types/restaurant';
import {
  inviteMember,
  revokeInvite,
  updateMemberRole,
  removeMember,
} from '~/services/lists.client';

interface ShareListDialogProps {
  open: boolean;
  list: RestaurantList | null;
  members: ListMember[];
  invites: ListInvite[];
  currentUserId: string;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function initials(member: ListMember): string {
  const name = member.profile?.displayName?.trim();
  return (name?.[0] ?? '?').toUpperCase();
}

export default function ShareListDialog({
  open,
  list,
  members,
  invites,
  currentUserId,
  canManage,
  onClose,
  onChanged,
}: ShareListDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<ListRole, 'owner'>>('editor');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!list) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Please enter a valid email address');
      return;
    }
    await run(async () => {
      await inviteMember(list.id, value, role, currentUserId);
      setEmail('');
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="share-dialog-title"
    >
      <DialogTitle
        id="share-dialog-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
        }}
      >
        Share “{list.name}”
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

        {canManage && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Invite by email
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="friend@example.com"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                sx={{ flex: 1, minWidth: 200 }}
                aria-label="Invite email"
              />
              <Select
                size="small"
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<ListRole, 'owner'>)}
                aria-label="Invite role"
              >
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleInvite}
                disabled={busy}
              >
                Invite
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              They’ll see the invite when they sign in with that email.
            </Typography>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Members
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {members.map((m) => (
            <Box
              key={m.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
              <Avatar
                src={m.profile?.avatarUrl}
                sx={{ width: 34, height: 34, fontSize: 14 }}
              >
                {initials(m)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {m.profile?.displayName || 'Member'}
                  {m.userId === currentUserId && ' (you)'}
                </Typography>
              </Box>
              {m.role === 'owner' || !canManage || m.userId === currentUserId ? (
                <Chip size="small" label={m.role} />
              ) : (
                <>
                  <Select
                    size="small"
                    value={m.role}
                    onChange={(e) =>
                      run(() =>
                        updateMemberRole(
                          m.id,
                          e.target.value as Exclude<ListRole, 'owner'>
                        )
                      )
                    }
                    sx={{ minWidth: 110 }}
                    aria-label={`Role for ${m.profile?.displayName || 'member'}`}
                  >
                    <MenuItem value="editor">Editor</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                  </Select>
                  <IconButton
                    size="small"
                    aria-label="Remove member"
                    onClick={() => run(() => removeMember(m.id))}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          ))}
        </Box>

        {canManage && invites.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Pending invites
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {invites.map((inv) => (
                <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'transparent', color: 'text.secondary' }}>
                    <Mail fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {inv.email}
                    </Typography>
                  </Box>
                  <Chip size="small" label={inv.role} />
                  <IconButton
                    size="small"
                    aria-label="Revoke invite"
                    onClick={() => run(() => revokeInvite(inv.id))}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {busy && <CircularProgress size={20} sx={{ mr: 1 }} />}
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
