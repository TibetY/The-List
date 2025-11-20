import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  DialogContentText,
  CircularProgress,
} from '@mui/material';

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

    // Basic email validation
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
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Email Restaurant List</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Enter the email address where you'd like to send your restaurant list.
        </DialogContentText>
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
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSend} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
