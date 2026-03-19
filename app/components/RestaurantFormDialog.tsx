import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Rating,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CloudUpload, Close } from '@mui/icons-material';
import type { Restaurant } from '~/types/restaurant';

interface RestaurantFormDialogProps {
  open: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onSave: (restaurant: Partial<Restaurant>, imageFile?: File) => Promise<void>;
}

const cuisineTypes = [
  'Italian',
  'Chinese',
  'Japanese',
  'Mexican',
  'Indian',
  'Thai',
  'French',
  'American',
  'Mediterranean',
  'Korean',
  'Vietnamese',
  'Greek',
  'Spanish',
  'Other',
];

const priceRanges = ['$', '$$', '$$$', '$$$$'];

export default function RestaurantFormDialog({
  open,
  restaurant,
  onClose,
  onSave,
}: RestaurantFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState<Partial<Restaurant>>({
    name: '',
    url: '',
    rating: 0,
    priceRange: '$$',
    comment: '',
    cuisineType: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      tiktok: '',
    },
  });
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        url: restaurant.url || '',
        rating: restaurant.rating || 0,
        priceRange: restaurant.priceRange || '$$',
        comment: restaurant.comment || '',
        cuisineType: restaurant.cuisineType || '',
        socialMedia: {
          facebook: restaurant.socialMedia?.facebook || '',
          instagram: restaurant.socialMedia?.instagram || '',
          twitter: restaurant.socialMedia?.twitter || '',
          tiktok: restaurant.socialMedia?.tiktok || '',
        },
      });
      setImagePreview(restaurant.image || '');
    } else {
      setFormData({
        name: '',
        url: '',
        rating: 0,
        priceRange: '$$',
        comment: '',
        cuisineType: '',
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: '',
          tiktok: '',
        },
      });
      setImagePreview('');
    }
    setImageFile(undefined);
  }, [restaurant, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData, imageFile);
      onClose();
    } catch (error) {
      console.error('Error saving restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = restaurant ? 'Edit Restaurant' : 'Add New Restaurant';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="restaurant-form-title"
    >
      <DialogTitle
        id="restaurant-form-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          pb: 1,
        }}
      >
        {dialogTitle}
        <IconButton
          onClick={onClose}
          aria-label="Close dialog"
          sx={{ color: 'text.secondary' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Grid container spacing={2.5} sx={{ mt: 0 }}>
          {/* Restaurant Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Restaurant Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              aria-required="true"
              autoFocus
            />
          </Grid>

          {/* Cuisine + Price */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Cuisine Type"
              value={formData.cuisineType}
              onChange={(e) =>
                setFormData({ ...formData, cuisineType: e.target.value })
              }
            >
              <MenuItem value="">None</MenuItem>
              {cuisineTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Price Range"
              value={formData.priceRange}
              onChange={(e) =>
                setFormData({ ...formData, priceRange: e.target.value })
              }
            >
              {priceRanges.map((range) => (
                <MenuItem key={range} value={range}>
                  {range}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Rating */}
          <Grid item xs={12}>
            <Typography
              component="label"
              id="rating-label"
              sx={{
                display: 'block',
                mb: 0.5,
                fontWeight: 500,
                color: 'text.secondary',
                fontSize: '0.875rem',
              }}
            >
              Rating
            </Typography>
            <Rating
              value={formData.rating || 0}
              onChange={(_, value) =>
                setFormData({ ...formData, rating: value || 0 })
              }
              precision={0.5}
              size="large"
              aria-labelledby="rating-label"
            />
          </Grid>

          {/* Website URL */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Website URL"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="https://..."
              type="url"
            />
          </Grid>

          {/* Comment */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={formData.comment}
              onChange={(e) =>
                setFormData({ ...formData, comment: e.target.value })
              }
              placeholder="What did you think? Any must-try dishes?"
            />
          </Grid>

          {/* Social Media */}
          <Grid item xs={12}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                mb: 1,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
              }}
            >
              Social Media
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Facebook"
              value={formData.socialMedia?.facebook}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialMedia: {
                    ...formData.socialMedia,
                    facebook: e.target.value,
                  },
                })
              }
              placeholder="https://facebook.com/..."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Instagram"
              value={formData.socialMedia?.instagram}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialMedia: {
                    ...formData.socialMedia,
                    instagram: e.target.value,
                  },
                })
              }
              placeholder="https://instagram.com/..."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Twitter / X"
              value={formData.socialMedia?.twitter}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialMedia: {
                    ...formData.socialMedia,
                    twitter: e.target.value,
                  },
                })
              }
              placeholder="https://x.com/..."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="TikTok"
              value={formData.socialMedia?.tiktok}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialMedia: {
                    ...formData.socialMedia,
                    tiktok: e.target.value,
                  },
                })
              }
              placeholder="https://tiktok.com/@..."
            />
          </Grid>

          {/* Image Upload */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
              sx={{
                py: 2,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.15)',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(232, 115, 74, 0.04)',
                },
              }}
            >
              {imagePreview ? 'Change Image' : 'Upload Image'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
                aria-label="Upload restaurant image"
              />
            </Button>
          </Grid>

          {imagePreview && (
            <Grid item xs={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <img
                  src={imagePreview}
                  alt="Restaurant preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '250px',
                    objectFit: 'cover',
                    display: 'block',
                    width: '100%',
                  }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ color: 'text.secondary' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name?.trim()}
          sx={{ minWidth: 120 }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : restaurant ? (
            'Save Changes'
          ) : (
            'Add Restaurant'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
