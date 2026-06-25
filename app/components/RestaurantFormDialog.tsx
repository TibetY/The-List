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
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CloudUpload, Close, Check, BookmarkBorder } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Restaurant, RestaurantStatus } from '~/types/restaurant';
import { cuisineTypes } from '~/types/restaurant';

interface RestaurantFormDialogProps {
  open: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onSave: (restaurant: Partial<Restaurant>, imageFile?: File) => Promise<void>;
}

const priceRanges = ['$', '$$', '$$$', '$$$$'];
const reservationPlatforms = ['resy', 'opentable'] as const;

export default function RestaurantFormDialog({
  open,
  restaurant,
  onClose,
  onSave,
}: RestaurantFormDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState<Partial<Restaurant>>({
    name: '',
    url: '',
    address: '',
    rating: 0,
    priceRange: '$$',
    comment: '',
    cuisineType: '',
    reservationPlatform: '',
    reservationUrl: '',
    status: 'want',
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
  const [fetchingInfo, setFetchingInfo] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        url: restaurant.url || '',
        address: restaurant.address || '',
        rating: restaurant.rating || 0,
        priceRange: restaurant.priceRange || '$$',
        comment: restaurant.comment || '',
        cuisineType: restaurant.cuisineType || '',
        reservationPlatform: restaurant.reservationPlatform || '',
        reservationUrl: restaurant.reservationUrl || '',
        status: restaurant.status || 'want',
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
        address: '',
        rating: 0,
        priceRange: '$$',
        comment: '',
        cuisineType: '',
        reservationPlatform: '',
        reservationUrl: '',
        status: 'want',
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

  const handleWebsiteBlur = async () => {
    const url = formData.url?.trim();
    if (!url || !/^https?:\/\/.+/i.test(url)) return;

    setFetchingInfo(true);
    try {
      const res = await fetch(`/api/scrape-website?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as {
        image: string | null;
        cuisineType: string | null;
        reservationPlatform: 'resy' | 'opentable' | null;
        reservationUrl: string | null;
      };
      setFormData((prev) => ({
        ...prev,
        cuisineType: prev.cuisineType || data.cuisineType || prev.cuisineType,
        reservationPlatform:
          prev.reservationPlatform || data.reservationPlatform || prev.reservationPlatform,
        reservationUrl: prev.reservationUrl || data.reservationUrl || prev.reservationUrl,
      }));
      if (data.image && !imagePreview && !imageFile) {
        setImagePreview(data.image);
        setFormData((prev) => ({ ...prev, image: data.image ?? undefined }));
      }
    } catch {
      // Best-effort enrichment; silently ignore failures.
    } finally {
      setFetchingInfo(false);
    }
  };

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

  const dialogTitle = restaurant ? t('form.editTitle') : t('form.addTitle');

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
          aria-label={t('form.close')}
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
              label={t('form.name')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Grid>

          {/* Address (geocoded to a map pin on save) */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('form.address')}
              placeholder={t('form.addressPlaceholder')}
              value={formData.address ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              helperText={t('form.addressHelp')}
            />
          </Grid>

          {/* Status: been / want to try */}
          <Grid item xs={12}>
            <Typography
              component="label"
              sx={{
                display: 'block',
                mb: 0.75,
                fontWeight: 500,
                color: 'text.secondary',
                fontSize: '0.875rem',
              }}
            >
              {t('form.status')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={formData.status || 'want'}
              onChange={(_, value: RestaurantStatus | null) => {
                if (value) setFormData({ ...formData, status: value });
              }}
              size="small"
              aria-label={t('form.statusLabel')}
            >
              <ToggleButton value="want" aria-label={t('form.wantToTry')}>
                <BookmarkBorder fontSize="small" sx={{ mr: 0.75 }} />
                {t('form.wantToTry')}
              </ToggleButton>
              <ToggleButton value="been" aria-label={t('form.been')}>
                <Check fontSize="small" sx={{ mr: 0.75 }} />
                {t('form.been')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Cuisine + Price */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label={t('form.cuisineType')}
              value={formData.cuisineType}
              onChange={(e) =>
                setFormData({ ...formData, cuisineType: e.target.value })
              }
            >
              <MenuItem value="">{t('form.none')}</MenuItem>
              {cuisineTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(`cuisines.${type}`, type)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label={t('form.priceRange')}
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
              {t('form.rating')}
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

          {/* Website URL — auto-fetches image/cuisine/reservation link on blur */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('form.websiteUrl')}
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              onBlur={handleWebsiteBlur}
              placeholder="https://..."
              type="url"
              InputProps={{
                endAdornment: fetchingInfo ? (
                  <CircularProgress size={18} />
                ) : undefined,
              }}
              helperText={fetchingInfo ? t('form.fetchingInfo') : undefined}
            />
          </Grid>

          {/* Reservation link — auto-filled from the website, manually editable */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label={t('form.reservationPlatform')}
              value={formData.reservationPlatform || ''}
              onChange={(e) =>
                setFormData({ ...formData, reservationPlatform: e.target.value })
              }
            >
              <MenuItem value="">{t('form.reservationNone')}</MenuItem>
              {reservationPlatforms.map((platform) => (
                <MenuItem key={platform} value={platform}>
                  {platform === 'resy' ? 'Resy' : 'OpenTable'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('form.reservationUrl')}
              value={formData.reservationUrl || ''}
              onChange={(e) =>
                setFormData({ ...formData, reservationUrl: e.target.value })
              }
              placeholder="https://resy.com/..."
              type="url"
            />
          </Grid>

          {/* Comment */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('form.notes')}
              value={formData.comment}
              onChange={(e) =>
                setFormData({ ...formData, comment: e.target.value })
              }
              placeholder={t('form.notesPlaceholder')}
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
              {t('form.socialMedia')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('form.facebook')}
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
              label={t('form.instagram')}
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
              label={t('form.twitter')}
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
              label={t('form.tiktok')}
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
              {imagePreview ? t('form.changeImage') : t('form.uploadImage')}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
                aria-label={t('form.uploadImageLabel')}
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
                  alt={t('form.previewAlt')}
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
          {t('form.cancel')}
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
            t('form.saveChanges')
          ) : (
            t('form.addRestaurant')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
