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
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
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
      alert('Restaurant name is required');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData, imageFile);
      onClose();
    } catch (error) {
      console.error('Error saving restaurant:', error);
      alert('Failed to save restaurant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{restaurant ? 'Edit Restaurant' : 'Add New Restaurant'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Restaurant Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Cuisine Type"
              value={formData.cuisineType}
              onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
            >
              {priceRanges.map((range) => (
                <MenuItem key={range} value={range}>
                  {range}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Typography component="legend">Rating</Typography>
            <Rating
              value={formData.rating || 0}
              onChange={(_, value) => setFormData({ ...formData, rating: value || 0 })}
              precision={0.5}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Website URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Comment / Notes"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Social Media Links
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
                  socialMedia: { ...formData.socialMedia, facebook: e.target.value },
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
                  socialMedia: { ...formData.socialMedia, instagram: e.target.value },
                })
              }
              placeholder="https://instagram.com/..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Twitter"
              value={formData.socialMedia?.twitter}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, twitter: e.target.value },
                })
              }
              placeholder="https://twitter.com/..."
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
                  socialMedia: { ...formData.socialMedia, tiktok: e.target.value },
                })
              }
              placeholder="https://tiktok.com/@..."
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
            >
              Upload Image
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
          </Grid>

          {imagePreview && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : restaurant ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
