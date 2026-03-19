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

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
}

export default function EmailDialog({ open, onClose, onSend }: EmailDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSend(email);
      setEmail('');
      onClose();
    } catch (err) {
      setError('Failed to send email. Please try again.');
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
              backgroundColor: 'rgba(232, 115, 74, 0.1)',
              display: 'flex',
            }}
            aria-hidden="true"
          >
            <Email sx={{ color: '#E8734A', fontSize: 20 }} />
          </Box>
          Share Your List
        </Box>
        <IconButton
          onClick={handleClose}
          aria-label="Close dialog"
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
          Enter the email address where you&apos;d like to send your curated
          restaurant list.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error}
          disabled={loading}
          aria-required="true"
          placeholder="friend@example.com"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ color: 'text.secondary' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={loading}
          sx={{ minWidth: 100 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
