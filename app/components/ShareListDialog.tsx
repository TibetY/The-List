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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(e instanceof Error ? e.message : t('share.somethingWrong'));
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
      setError(t('share.couldNotCopy'));
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
        {t('share.title', { name: list.name })}
        <IconButton onClick={onClose} aria-label={t('share.close')} sx={{ color: 'text.secondary' }}>
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
              {t('share.inviteLink')}
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
                          {copied ? t('share.copied') : t('share.copy')}
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  aria-label={t('share.inviteLink')}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('share.joinsAsLong')}
                  </Typography>
                  <Chip size="small" label={t(`roles.${inviteLink.role}`)} />
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() => run(() => revokeInviteLink(inviteLink.id))}
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('share.revoke')}
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('share.joinsAs')}
                </Typography>
                <Select
                  size="small"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Exclude<ListRole, 'owner'>)}
                  aria-label={t('share.inviteRole')}
                >
                  <MenuItem value="editor">{t('roles.editor')}</MenuItem>
                  <MenuItem value="viewer">{t('roles.viewer')}</MenuItem>
                </Select>
                <Button
                  variant="contained"
                  startIcon={<LinkIcon />}
                  disabled={busy}
                  onClick={() =>
                    run(() => createInviteLink(list.id, role, currentUserId).then(() => undefined))
                  }
                >
                  {t('share.createLink')}
                </Button>
              </Box>
            )}
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('share.members')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {members.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                src={m.profile?.avatarUrl}
                alt={m.profile?.displayName || t('share.member')}
                sx={{ width: 34, height: 34, fontSize: 14 }}
              >
                {initials(m)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {m.profile?.displayName || t('share.member')}
                  {m.userId === currentUserId && t('share.you')}
                </Typography>
              </Box>
              {m.role === 'owner' || !canManage || m.userId === currentUserId ? (
                <Chip size="small" label={t(`roles.${m.role}`)} />
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
                    aria-label={t('share.roleFor', { name: m.profile?.displayName || t('share.member') })}
                  >
                    <MenuItem value="editor">{t('roles.editor')}</MenuItem>
                    <MenuItem value="viewer">{t('roles.viewer')}</MenuItem>
                  </Select>
                  <IconButton
                    size="small"
                    aria-label={t('share.removeMember')}
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
        <Button onClick={onClose}>{t('share.done')}</Button>
      </DialogActions>
    </Dialog>
  );
}
