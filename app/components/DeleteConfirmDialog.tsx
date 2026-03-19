import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';

interface DeleteConfirmDialogProps {
  open: boolean;
  restaurantName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog({
  open,
  restaurantName,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <DialogTitle
        id="delete-dialog-title"
        sx={{ fontWeight: 700, pb: 1 }}
      >
        Delete Restaurant
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <WarningAmber sx={{ color: '#EF4444' }} />
          </Box>
          <Typography
            id="delete-dialog-description"
            variant="body1"
            sx={{ color: 'text.secondary', lineHeight: 1.6 }}
          >
            Are you sure you want to delete{' '}
            <strong style={{ color: '#F5F5F7' }}>{restaurantName}</strong>?
            This action cannot be undone.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
            },
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
