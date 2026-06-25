import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EventSeat,
  Language,
  Facebook,
  Instagram,
  Twitter,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';
import RestaurantThumb from '~/components/RestaurantThumb';

type Tokens = (typeof listTokens)['light'];

function reservationLabel(platform: string): string {
  if (platform === 'resy') return 'Resy';
  if (platform === 'opentable') return 'OpenTable';
  if (platform === 'walkin') return '';
  return platform;
}

interface RestaurantDetailDialogProps {
  open: boolean;
  restaurant: Restaurant | null;
  canEdit: boolean;
  tokens: Tokens;
  serifFont: string;
  onClose: () => void;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
}

export default function RestaurantDetailDialog({
  open,
  restaurant,
  canEdit,
  tokens: t,
  serifFont,
  onClose,
  onEdit,
  onDelete,
}: RestaurantDetailDialogProps) {
  const { t: tr } = useTranslation();
  const [activeLoc, setActiveLoc] = useState(0);
  // Reset to the first location tab whenever a different restaurant is opened.
  useEffect(() => {
    setActiveLoc(0);
  }, [restaurant?.id]);
  if (!restaurant) return null;

  const r = restaurant;
  const locations = r.locations ?? [];
  const safeIdx = locations.length ? Math.min(activeLoc, locations.length - 1) : 0;
  const loc = locations[safeIdx] ?? {};
  const rating = Math.round(r.rating ?? 0);
  const initial = (r.name.replace(/^The /i, '')[0] || '?').toUpperCase();
  const isBeen = (r.status ?? 'want') === 'been';

  const sectionLabel = {
    display: 'block',
    color: t.muted,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '.05em',
    mb: '6px',
  };

  const chipSx = {
    background: t.searchBg,
    border: `1px solid ${t.pillBorder}`,
    color: t.chip,
    fontSize: 12.5,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="restaurant-detail-title"
      PaperProps={{
        sx: { background: t.cardBg, color: t.ink, borderRadius: '18px', overflow: 'hidden' },
      }}
    >
      {/* Hero image / initial */}
      <Box sx={{ position: 'relative', height: 200 }}>
        <RestaurantThumb
          image={r.image}
          alt={r.name}
          initial={initial}
          serifFont={serifFont}
          tokens={t}
          initialFontSize={88}
          sx={{ height: '100%' }}
        />
        <IconButton
          onClick={onClose}
          aria-label={tr('form.close')}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.45)',
            color: '#fff',
            '&:hover': { background: 'rgba(0,0,0,0.65)' },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: isBeen ? t.beenBg : t.wantBg,
            color: isBeen ? t.beenFg : t.wantFg,
            fontSize: 11.5,
            fontWeight: 600,
            padding: '5px 11px',
            borderRadius: '999px',
          }}
        >
          {isBeen ? tr('dashboard.statusBeen') : tr('dashboard.statusWant')}
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Name + price */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
          <Box id="restaurant-detail-title" component="h2" sx={{ fontFamily: serifFont, fontSize: 30, m: 0, lineHeight: 1.1 }}>
            {r.name}
          </Box>
          {r.priceRange && (
            <Box component="span" sx={{ color: t.cost, fontSize: 17, fontWeight: 600, letterSpacing: '.03em', flex: 'none' }}>
              {r.priceRange}
            </Box>
          )}
        </Box>

        {/* Rating */}
        <Box sx={{ mt: '8px', minHeight: 20 }}>
          {rating > 0 ? (
            <Box component="span" sx={{ color: t.rating, fontSize: 17, letterSpacing: '2px' }}>
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </Box>
          ) : (
            <Box component="span" sx={{ color: t.notRated, fontSize: 13, fontStyle: 'italic' }}>
              {tr('detail.notRated')}
            </Box>
          )}
        </Box>

        {/* Recognition: Michelin stars + Bib Gourmand */}
        {((r.michelinStars ?? 0) > 0 || r.bibGourmand) && (
          <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', mt: '14px' }}>
            {(r.michelinStars ?? 0) > 0 && (
              <Chip
                size="small"
                label={tr('detail.michelin', { count: r.michelinStars }) + ' ' + '⭐'.repeat(r.michelinStars ?? 0)}
                sx={{ ...chipSx, background: t.pBg, color: t.pFg, fontWeight: 600 }}
              />
            )}
            {r.bibGourmand && (
              <Chip
                size="small"
                label={tr('form.bibGourmand')}
                sx={{ ...chipSx, background: t.pBg, color: t.pFg, fontWeight: 600 }}
              />
            )}
          </Box>
        )}

        {/* Cuisine + place types */}
        {(r.cuisineType || (r.placeTypes && r.placeTypes.length > 0)) && (
          <Box sx={{ mt: '16px' }}>
            <Box component="span" sx={sectionLabel}>{tr('detail.about')}</Box>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {r.cuisineType && <Chip size="small" label={tr(`cuisines.${r.cuisineType}`, r.cuisineType)} sx={chipSx} />}
              {r.placeTypes?.map((pt) => (
                <Chip key={pt} size="small" label={tr(`placeTypes.${pt}`, pt)} sx={chipSx} />
              ))}
            </Box>
          </Box>
        )}

        {/* Dietary */}
        {r.dietaryTags && r.dietaryTags.length > 0 && (
          <Box sx={{ mt: '16px' }}>
            <Box component="span" sx={sectionLabel}>{tr('form.dietaryTags')}</Box>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {r.dietaryTags.map((tag) => (
                <Chip key={tag} size="small" label={tr(`dietary.${tag}`, tag)} sx={chipSx} />
              ))}
            </Box>
          </Box>
        )}

        {/* Menu types */}
        {r.menuTypes && r.menuTypes.length > 0 && (
          <Box sx={{ mt: '16px' }}>
            <Box component="span" sx={sectionLabel}>{tr('form.menuTypes')}</Box>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {r.menuTypes.map((m) => (
                <Chip key={m} size="small" label={tr(`menuTypes.${m}`, m)} sx={chipSx} />
              ))}
            </Box>
          </Box>
        )}

        {/* Locations — address/contact/booking, tabbed when there's more than one */}
        {locations.length > 0 && (
          <Box sx={{ mt: '16px' }}>
            {locations.length > 1 && (
              <Tabs
                value={safeIdx}
                onChange={(_, v: number) => setActiveLoc(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: '10px', minHeight: 36 }}
              >
                {locations.map((l, i) => (
                  <Tab
                    key={i}
                    label={l.label?.trim() || tr('form.locationN', { n: i + 1 })}
                    sx={{
                      minHeight: 36,
                      textTransform: 'none',
                      color: t.muted,
                      '&.Mui-selected': { color: t.ink },
                    }}
                  />
                ))}
              </Tabs>
            )}

            {loc.address && (
              <Box sx={{ mb: '10px' }}>
                <Box component="span" sx={sectionLabel}>{tr('form.address')}</Box>
                <Box sx={{ color: t.ink, fontSize: 14 }}>{loc.address}</Box>
              </Box>
            )}

            {(loc.phone || loc.email) && (
              <Box sx={{ display: 'flex', gap: '4px' }}>
                {loc.phone && (
                  <IconButton component="a" href={`tel:${loc.phone}`} aria-label={tr('detail.phone')} sx={{ color: t.muted }}>
                    <PhoneIcon fontSize="small" />
                  </IconButton>
                )}
                {loc.email && (
                  <IconButton component="a" href={`mailto:${loc.email}`} aria-label={tr('detail.email')} sx={{ color: t.muted }}>
                    <EmailIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}

            {loc.reservationUrl && (
              <Box sx={{ mt: '12px' }}>
                <Button
                  variant="outlined"
                  component="a"
                  href={loc.reservationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<EventSeat fontSize="small" />}
                >
                  {tr('dashboard.reserveOn', { platform: reservationLabel(loc.reservationPlatform || '') })}
                </Button>
              </Box>
            )}
            {!loc.reservationUrl && loc.reservationPlatform === 'walkin' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '12px', color: t.muted, fontSize: 14 }}>
                <EventSeat fontSize="small" /> {tr('detail.walkinBadge')}
              </Box>
            )}
          </Box>
        )}

        {/* Comment / notes */}
        {r.comment && (
          <Box sx={{ mt: '16px' }}>
            <Box component="span" sx={sectionLabel}>{tr('form.notes')}</Box>
            <Box sx={{ color: t.ink, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.comment}</Box>
          </Box>
        )}

        {/* Links */}
        {(r.url || r.socialMedia?.facebook || r.socialMedia?.instagram || r.socialMedia?.twitter) && (
          <Box sx={{ display: 'flex', gap: '4px', mt: '14px' }}>
            {r.url && (
              <IconButton component="a" href={r.url} target="_blank" rel="noopener noreferrer" aria-label={tr('form.websiteUrl')} sx={{ color: t.muted }}>
                <Language fontSize="small" />
              </IconButton>
            )}
            {r.socialMedia?.facebook && (
              <IconButton component="a" href={r.socialMedia.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" sx={{ color: t.muted }}>
                <Facebook fontSize="small" />
              </IconButton>
            )}
            {r.socialMedia?.instagram && (
              <IconButton component="a" href={r.socialMedia.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" sx={{ color: t.muted }}>
                <Instagram fontSize="small" />
              </IconButton>
            )}
            {r.socialMedia?.twitter && (
              <IconButton component="a" href={r.socialMedia.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" sx={{ color: t.muted }}>
                <Twitter fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}

        {/* Actions */}
        {canEdit && (
          <Box sx={{ display: 'flex', gap: '10px', mt: '24px' }}>
            <Button
              variant="contained"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEdit(r)}
              sx={{ background: t.accent, color: t.accentText, '&:hover': { background: t.accent, filter: 'brightness(0.95)' } }}
            >
              {tr('detail.edit')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => r.id && onDelete(r.id)}
            >
              {tr('detail.delete')}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
