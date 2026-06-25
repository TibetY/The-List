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
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CloudUpload,
  Close,
  Check,
  BookmarkBorder,
  Add,
  DeleteOutline,
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type {
  Restaurant,
  RestaurantLocation,
  RestaurantStatus,
} from '~/types/restaurant';
import {
  cuisineTypes,
  dietaryTags,
  placeTypes,
  menuTypes,
} from '~/types/restaurant';

interface RestaurantFormDialogProps {
  open: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onSave: (restaurant: Partial<Restaurant>, imageFile?: File) => Promise<void>;
}

const priceRanges = ['$', '$$', '$$$', '$$$$', '$$$$$'];
const reservationPlatforms = ['resy', 'opentable', 'walkin', 'custom'] as const;
const knownReservationPlatforms = ['resy', 'opentable', 'walkin'];
const michelinStarOptions = [0, 1, 2, 3];

/** Cuisine value isn't in the predefined list, so it's a custom "Other" entry. */
function isCustomCuisine(cuisine: string | undefined): boolean {
  return !!cuisine && cuisine !== '' && !cuisineTypes.includes(cuisine);
}

/** Reservation platform isn't one of the predefined options, so it's a custom entry. */
function isCustomPlatform(platform: string | undefined): boolean {
  return !!platform && !knownReservationPlatforms.includes(platform);
}

/** Derive which reservation-select option matches a location's stored platform. */
function platformChoiceFor(loc: RestaurantLocation | undefined): string {
  const p = loc?.reservationPlatform;
  return isCustomPlatform(p) ? 'custom' : p || '';
}

const EMPTY_BRAND: Partial<Restaurant> = {
  name: '',
  url: '',
  image: '',
  rating: 0,
  priceRange: '$$',
  comment: '',
  cuisineType: '',
  dietaryTags: [],
  placeTypes: [],
  menuTypes: [],
  michelinStars: 0,
  bibGourmand: false,
  visitCount: 0,
  favorite: false,
  status: 'want',
  socialMedia: { facebook: '', instagram: '', twitter: '', tiktok: '' },
};

export default function RestaurantFormDialog({
  open,
  restaurant,
  onClose,
  onSave,
}: RestaurantFormDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Brand-level fields only; per-location data lives in `locations`.
  const [formData, setFormData] = useState<Partial<Restaurant>>({ ...EMPTY_BRAND });
  // One or more physical locations (address/pin/contact/booking). Always ≥1.
  const [locations, setLocations] = useState<RestaurantLocation[]>([{}]);
  const [activeLocation, setActiveLocation] = useState(0);
  // Dropdown selection for cuisine; 'Other' reveals a free-text field whose value
  // is what actually gets stored in formData.cuisineType.
  const [cuisineChoice, setCuisineChoice] = useState<string>('');
  // Reservation-platform select for the ACTIVE location ('custom' reveals a
  // free-text field). Recomputed when the active tab changes.
  const [platformChoice, setPlatformChoice] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [imagePreview, setImagePreview] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  // Whether the last website scrape returned anything useful.
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'ok' | 'empty'>('idle');

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        url: restaurant.url || '',
        image: restaurant.image || '',
        rating: restaurant.rating || 0,
        priceRange: restaurant.priceRange || '$$',
        comment: restaurant.comment || '',
        cuisineType: restaurant.cuisineType || '',
        dietaryTags: restaurant.dietaryTags || [],
        placeTypes: restaurant.placeTypes || [],
        menuTypes: restaurant.menuTypes || [],
        michelinStars: restaurant.michelinStars || 0,
        bibGourmand: restaurant.bibGourmand || false,
        visitCount: restaurant.visitCount || 0,
        favorite: restaurant.favorite || false,
        status: restaurant.status || 'want',
        socialMedia: {
          facebook: restaurant.socialMedia?.facebook || '',
          instagram: restaurant.socialMedia?.instagram || '',
          twitter: restaurant.socialMedia?.twitter || '',
          tiktok: restaurant.socialMedia?.tiktok || '',
        },
      });
      const locs =
        restaurant.locations && restaurant.locations.length > 0
          ? restaurant.locations.map((l) => ({ ...l }))
          : [{}];
      setLocations(locs);
      setActiveLocation(0);
      setCuisineChoice(
        isCustomCuisine(restaurant.cuisineType) ? 'Other' : restaurant.cuisineType || ''
      );
      setPlatformChoice(platformChoiceFor(locs[0]));
      setImagePreview(restaurant.image || '');
    } else {
      setFormData({ ...EMPTY_BRAND });
      setLocations([{}]);
      setActiveLocation(0);
      setCuisineChoice('');
      setPlatformChoice('');
      setImagePreview('');
    }
    setScrapeStatus('idle');
    setImageFile(undefined);
  }, [restaurant, open]);

  /** Patch the currently-active location. */
  const updateActiveLocation = (patch: Partial<RestaurantLocation>) => {
    setLocations((prev) =>
      prev.map((loc, i) => (i === activeLocation ? { ...loc, ...patch } : loc))
    );
  };

  const addLocation = () => {
    setLocations((prev) => [...prev, {}]);
    setActiveLocation(locations.length); // the new tab's index
    setPlatformChoice('');
  };

  const removeLocation = (index: number) => {
    setLocations((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const safe = next.length > 0 ? next : [{}];
      const newActive = Math.max(0, Math.min(activeLocation, safe.length - 1));
      setActiveLocation(newActive);
      setPlatformChoice(platformChoiceFor(safe[newActive]));
      return safe;
    });
  };

  const switchLocation = (index: number) => {
    setActiveLocation(index);
    setPlatformChoice(platformChoiceFor(locations[index]));
  };

  const handleWebsiteBlur = async () => {
    const url = formData.url?.trim();
    if (!url || !/^https?:\/\/.+/i.test(url)) return;

    setFetchingInfo(true);
    setScrapeStatus('idle');
    try {
      const res = await fetch(`/api/scrape-website?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as {
        image: string | null;
        cuisineType: string | null;
        reservationPlatform: 'resy' | 'opentable' | null;
        reservationUrl: string | null;
        address: string | null;
        email: string | null;
        phone: string | null;
      };
      const foundAnything = Boolean(
        data.image ||
          data.cuisineType ||
          data.reservationPlatform ||
          data.reservationUrl ||
          data.address ||
          data.email ||
          data.phone
      );
      setScrapeStatus(foundAnything ? 'ok' : 'empty');

      // Brand-level enrichment.
      setFormData((prev) => ({
        ...prev,
        cuisineType: prev.cuisineType || data.cuisineType || prev.cuisineType,
      }));
      if (data.cuisineType && !formData.cuisineType && cuisineTypes.includes(data.cuisineType)) {
        setCuisineChoice(data.cuisineType);
      }

      // Per-location enrichment targets the active location, filling only blanks.
      const active = locations[activeLocation] ?? {};
      const patch: Partial<RestaurantLocation> = {};
      if (!active.address && data.address) patch.address = data.address;
      if (!active.email && data.email) patch.email = data.email;
      if (!active.phone && data.phone) patch.phone = data.phone;
      if (!active.reservationUrl && data.reservationUrl) patch.reservationUrl = data.reservationUrl;
      if (!active.reservationPlatform && data.reservationPlatform) {
        patch.reservationPlatform = data.reservationPlatform;
      }
      if (Object.keys(patch).length > 0) {
        updateActiveLocation(patch);
        if (patch.reservationPlatform && knownReservationPlatforms.includes(patch.reservationPlatform)) {
          setPlatformChoice(patch.reservationPlatform);
        }
      }

      if (data.image && !imagePreview && !imageFile) {
        setImagePreview(data.image);
        setFormData((prev) => ({ ...prev, image: data.image ?? undefined }));
      }
    } catch {
      // Best-effort enrichment; treat a hard failure like "nothing found".
      setScrapeStatus('empty');
    } finally {
      setFetchingInfo(false);
    }
  };

  const applyImageFile = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyImageFile(file);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) applyImageFile(file);
  };

  const handleImageUrlPaste = (value: string) => {
    setImagePreview(value);
    setFormData((prev) => ({ ...prev, image: value }));
    setImageFile(undefined);
  };

  const handleCuisineChange = (value: string) => {
    setCuisineChoice(value);
    // 'Other' keeps whatever custom text is already typed; anything else stores
    // the chosen cuisine directly.
    if (value === 'Other') {
      setFormData((prev) => ({
        ...prev,
        cuisineType: isCustomCuisine(prev.cuisineType) ? prev.cuisineType : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, cuisineType: value }));
    }
  };

  const handlePlatformChange = (value: string) => {
    setPlatformChoice(value);
    if (value === 'custom') {
      const current = locations[activeLocation]?.reservationPlatform;
      updateActiveLocation({
        reservationPlatform: isCustomPlatform(current) ? current : '',
      });
    } else if (value === 'walkin') {
      updateActiveLocation({ reservationPlatform: 'walkin', reservationUrl: '' });
    } else {
      updateActiveLocation({ reservationPlatform: value });
    }
  };

  const toggleArrayValue = (
    field: 'dietaryTags' | 'placeTypes' | 'menuTypes',
    value: string
  ) => {
    setFormData((prev) => {
      const current = prev[field] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSave({ ...formData, locations }, imageFile);
      onClose();
    } catch (error) {
      console.error('Error saving restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = restaurant ? t('form.editTitle') : t('form.addTitle');
  const loc = locations[activeLocation] ?? {};
  const sectionLabelSx = {
    display: 'block',
    mb: 0.5,
    fontWeight: 500,
    color: 'text.secondary',
    fontSize: '0.875rem',
  } as const;

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

          {/* Favourite + times visited */}
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  icon={<FavoriteBorder />}
                  checkedIcon={<Favorite />}
                  checked={formData.favorite ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, favorite: e.target.checked })
                  }
                  sx={{ color: 'text.secondary', '&.Mui-checked': { color: 'error.main' } }}
                />
              }
              label={t('form.favorite')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label={t('form.visitCount')}
              value={formData.visitCount ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  visitCount: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                })
              }
              inputProps={{ min: 0, 'aria-label': t('form.visitCount') }}
            />
          </Grid>

          {/* Cuisine + Price */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label={t('form.cuisineType')}
              value={cuisineChoice}
              onChange={(e) => handleCuisineChange(e.target.value)}
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

          {/* Custom cuisine — shown only when "Other" is selected */}
          {cuisineChoice === 'Other' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('form.customCuisine')}
                placeholder={t('form.customCuisinePlaceholder')}
                value={isCustomCuisine(formData.cuisineType) ? formData.cuisineType : ''}
                onChange={(e) =>
                  setFormData({ ...formData, cuisineType: e.target.value })
                }
              />
            </Grid>
          )}

          {/* Place types — multi-select (a venue can be more than one) */}
          <Grid item xs={12}>
            <Typography component="label" sx={sectionLabelSx}>
              {t('form.placeTypes')}
            </Typography>
            <FormGroup row>
              {placeTypes.map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      checked={formData.placeTypes?.includes(type) ?? false}
                      onChange={() => toggleArrayValue('placeTypes', type)}
                    />
                  }
                  label={t(`placeTypes.${type}`, type)}
                />
              ))}
            </FormGroup>
          </Grid>

          {/* Menu types — multi-select (Fine Dining, Tasting Menu, …) */}
          <Grid item xs={12}>
            <Typography component="label" sx={sectionLabelSx}>
              {t('form.menuTypes')}
            </Typography>
            <FormGroup row>
              {menuTypes.map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      checked={formData.menuTypes?.includes(type) ?? false}
                      onChange={() => toggleArrayValue('menuTypes', type)}
                    />
                  }
                  label={t(`menuTypes.${type}`, type)}
                />
              ))}
            </FormGroup>
          </Grid>

          {/* Dietary options — multi-select */}
          <Grid item xs={12}>
            <Typography component="label" sx={sectionLabelSx}>
              {t('form.dietaryTags')}
            </Typography>
            <FormGroup row>
              {dietaryTags.map((tag) => (
                <FormControlLabel
                  key={tag}
                  control={
                    <Checkbox
                      checked={formData.dietaryTags?.includes(tag) ?? false}
                      onChange={() => toggleArrayValue('dietaryTags', tag)}
                    />
                  }
                  label={t(`dietary.${tag}`, tag)}
                />
              ))}
            </FormGroup>
          </Grid>

          {/* Recognition — Michelin stars + Bib Gourmand */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label={t('form.michelinStars')}
              value={formData.michelinStars ?? 0}
              onChange={(e) =>
                setFormData({ ...formData, michelinStars: Number(e.target.value) })
              }
            >
              {michelinStarOptions.map((n) => (
                <MenuItem key={n} value={n}>
                  {n === 0 ? t('form.none') : '★'.repeat(n)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.bibGourmand ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, bibGourmand: e.target.checked })
                  }
                />
              }
              label={t('form.bibGourmand')}
            />
          </Grid>

          {/* Rating */}
          <Grid item xs={12}>
            <Typography component="label" id="rating-label" sx={sectionLabelSx}>
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
              onChange={(e) => {
                setFormData({ ...formData, url: e.target.value });
                if (scrapeStatus !== 'idle') setScrapeStatus('idle');
              }}
              onBlur={handleWebsiteBlur}
              placeholder="https://..."
              type="url"
              error={scrapeStatus === 'empty'}
              InputProps={{
                endAdornment: fetchingInfo ? (
                  <CircularProgress size={18} />
                ) : undefined,
              }}
              helperText={
                fetchingInfo
                  ? t('form.fetchingInfo')
                  : scrapeStatus === 'empty'
                    ? t('form.scrapeNoInfo')
                    : undefined
              }
            />
          </Grid>

          {/* Locations — one or more branches, each with its own pin/contact/booking */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography component="span" sx={{ ...sectionLabelSx, mb: 0 }}>
                {t('form.locations')}
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={addLocation}>
                {t('form.addLocation')}
              </Button>
            </Box>

            {locations.length > 1 && (
              <Tabs
                value={activeLocation}
                onChange={(_, v: number) => switchLocation(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 1.5, minHeight: 40 }}
              >
                {locations.map((l, i) => (
                  <Tab
                    key={i}
                    label={l.label?.trim() || t('form.locationN', { n: i + 1 })}
                    sx={{ minHeight: 40, textTransform: 'none' }}
                  />
                ))}
              </Tabs>
            )}

            <Box
              sx={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                p: 2,
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={locations.length > 1 ? 10 : 12}>
                  <TextField
                    fullWidth
                    label={t('form.locationLabel')}
                    placeholder={t('form.locationLabelPlaceholder')}
                    value={loc.label ?? ''}
                    onChange={(e) => updateActiveLocation({ label: e.target.value })}
                  />
                </Grid>
                {locations.length > 1 && (
                  <Grid
                    item
                    xs={12}
                    sm={2}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <IconButton
                      onClick={() => removeLocation(activeLocation)}
                      aria-label={t('form.removeLocation')}
                      color="error"
                    >
                      <DeleteOutline />
                    </IconButton>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('form.address')}
                    placeholder={t('form.addressPlaceholder')}
                    value={loc.address ?? ''}
                    onChange={(e) => updateActiveLocation({ address: e.target.value })}
                    helperText={t('form.addressHelp')}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('form.email')}
                    value={loc.email ?? ''}
                    onChange={(e) => updateActiveLocation({ email: e.target.value })}
                    type="email"
                    placeholder="contact@restaurant.com"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('form.phone')}
                    value={loc.phone ?? ''}
                    onChange={(e) => updateActiveLocation({ phone: e.target.value })}
                    type="tel"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label={t('form.reservationPlatform')}
                    value={platformChoice}
                    onChange={(e) => handlePlatformChange(e.target.value)}
                  >
                    <MenuItem value="">{t('form.reservationNone')}</MenuItem>
                    {reservationPlatforms.map((platform) => (
                      <MenuItem key={platform} value={platform}>
                        {platform === 'resy'
                          ? 'Resy'
                          : platform === 'opentable'
                            ? 'OpenTable'
                            : platform === 'walkin'
                              ? t('form.reservationWalkin')
                              : t('form.reservationCustom')}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {platformChoice !== 'walkin' && platformChoice !== 'custom' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={t('form.reservationUrl')}
                      value={loc.reservationUrl ?? ''}
                      onChange={(e) =>
                        updateActiveLocation({ reservationUrl: e.target.value })
                      }
                      placeholder="https://resy.com/..."
                      type="url"
                    />
                  </Grid>
                )}
                {platformChoice === 'custom' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={t('form.customPlatformName')}
                      placeholder={t('form.customPlatformPlaceholder')}
                      value={isCustomPlatform(loc.reservationPlatform) ? loc.reservationPlatform : ''}
                      onChange={(e) =>
                        updateActiveLocation({ reservationPlatform: e.target.value })
                      }
                    />
                  </Grid>
                )}
                {platformChoice === 'custom' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={t('form.reservationUrl')}
                      value={loc.reservationUrl ?? ''}
                      onChange={(e) =>
                        updateActiveLocation({ reservationUrl: e.target.value })
                      }
                      placeholder="https://..."
                      type="url"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
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

          {/* Image Upload — file picker, drag-and-drop, or a pasted URL */}
          <Grid item xs={12}>
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleImageDrop}
            >
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{
                  py: 2,
                  borderStyle: 'dashed',
                  borderColor: dragActive ? 'primary.main' : 'rgba(255,255,255,0.15)',
                  backgroundColor: dragActive ? 'rgba(232, 115, 74, 0.08)' : undefined,
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
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('form.pasteImageUrl')}
              placeholder={t('form.pasteImageUrlPlaceholder')}
              value={imageFile ? '' : imagePreview}
              onChange={(e) => handleImageUrlPaste(e.target.value)}
              type="url"
            />
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
