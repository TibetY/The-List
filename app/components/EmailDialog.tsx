import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Box,
} from '@mui/material';
import { Close, Email } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
}

export default function EmailDialog({ open, onClose, onSend }: EmailDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) {
      setError(t('email.required'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('email.invalid'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSend(email);
      setEmail('');
      onClose();
    } catch (err) {
      setError(t('email.failed'));
      console.error('Error sending email:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="email-dialog-title"
    >
      <DialogTitle
        id="email-dialog-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '12px',
              backgroundColor: 'action.hover',
              display: 'flex',
            }}
            aria-hidden="true"
          >
            <Email sx={{ color: 'primary.main', fontSize: 20 }} />
          </Box>
          {t('email.title')}
        </Box>
        <IconButton
          onClick={handleClose}
          aria-label={t('email.close')}
          sx={{ color: 'text.secondary' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mb: 2.5, lineHeight: 1.6 }}
        >
          {t('email.intro')}
        </Typography>
        <TextField
          required
          fullWidth
          label={t('email.email')}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error}
          disabled={loading}
          placeholder={t('email.placeholder')}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ color: 'text.secondary' }}
        >
          {t('email.cancel')}
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={loading}
          sx={{ minWidth: 100 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t('email.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
