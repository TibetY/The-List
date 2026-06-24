import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Avatar,
  Select,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Close, Delete, ContentCopy, Link as LinkIcon } from '@mui/icons-material';
import type {
  InviteLink,
  ListMember,
  ListRole,
  RestaurantList,
} from '~/types/restaurant';
import {
  createInviteLink,
  revokeInviteLink,
  updateMemberRole,
  removeMember,
} from '~/services/lists.client';

interface ShareListDialogProps {
  open: boolean;
  list: RestaurantList | null;
  members: ListMember[];
  inviteLink: InviteLink | null;
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
  inviteLink,
  currentUserId,
  canManage,
  onClose,
  onChanged,
}: ShareListDialogProps) {
  const [role, setRole] = useState<Exclude<ListRole, 'owner'>>('editor');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!list) return null;

  const linkUrl =
    inviteLink && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${inviteLink.token}`
      : '';

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

  const handleCopy = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy link');
    }
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
              Invite link
            </Typography>

            {inviteLink ? (
              <>
                <TextField
                  fullWidth
                  size="small"
                  value={linkUrl}
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          startIcon={<ContentCopy fontSize="small" />}
                          onClick={handleCopy}
                        >
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  aria-label="Invite link"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Anyone who opens this link joins as
                  </Typography>
                  <Chip size="small" label={inviteLink.role} />
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() => run(() => revokeInviteLink(inviteLink.id))}
                    sx={{ color: 'text.secondary' }}
                  >
                    Revoke
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Joins as
                </Typography>
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
                  startIcon={<LinkIcon />}
                  disabled={busy}
                  onClick={() =>
                    run(() => createInviteLink(list.id, role, currentUserId).then(() => undefined))
                  }
                >
                  Create link
                </Button>
              </Box>
            )}
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Members
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {members.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                src={m.profile?.avatarUrl}
                alt={m.profile?.displayName || 'Member'}
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {busy && <CircularProgress size={20} sx={{ mr: 1 }} />}
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
