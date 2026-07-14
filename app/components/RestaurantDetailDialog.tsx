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
  useMediaQuery,
  useTheme,
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
  Favorite,
  FavoriteBorder,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';
import RestaurantThumb from '~/components/RestaurantThumb';
import Stars from '~/components/Stars';

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
  onToggleFavorite?: (restaurant: Restaurant) => void;
  onAddVisit?: (restaurant: Restaurant) => void;
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
  onToggleFavorite,
  onAddVisit,
}: RestaurantDetailDialogProps) {
  const { t: tr } = useTranslation();
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [activeLoc, setActiveLoc] = useState(0);
  const [tab, setTab] = useState<'reservations' | 'hours' | 'instagram' | 'guides'>('reservations');
  // When a different restaurant is opened, default to the first location that
  // actually takes bookings so the "Reserve" action is visible without having to
  // hunt through tabs; fall back to the first location otherwise.
  useEffect(() => {
    const locs = restaurant?.locations ?? [];
    const bookable = locs.findIndex(
      (l) => l.reservationUrl || l.reservationPlatform === 'walkin'
    );
    setActiveLoc(bookable >= 0 ? bookable : 0);
    setTab('reservations');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const tabSx = {
    minHeight: 40,
    textTransform: 'none' as const,
    color: t.muted,
    fontSize: 13.5,
    '&.Mui-selected': { color: t.ink },
  };

  const hasLinks = Boolean(
    r.url || r.socialMedia?.facebook || r.socialMedia?.instagram || r.socialMedia?.twitter
  );

  /** Quiet empty state for a tab with no data yet (Hours/Guides, or no bookings). */
  const emptyTab = (label: string) => (
    <Box sx={{ py: '18px', textAlign: 'center', color: t.faint, fontSize: 13.5, fontStyle: 'italic' }}>
      {label}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="restaurant-detail-title"
      PaperProps={{
        sx: { background: t.cardBg, color: t.ink, borderRadius: fullScreen ? 0 : '18px', overflow: 'hidden' },
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
        {/* Name + price + favourite */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box id="restaurant-detail-title" component="h2" sx={{ fontFamily: serifFont, fontSize: 30, m: 0, lineHeight: 1.1 }}>
            {r.name}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 'none' }}>
            {r.priceRange && (
              <Box component="span" sx={{ color: t.cost, fontSize: 17, fontWeight: 600, letterSpacing: '.03em', fontFamily: "'DM Mono',monospace" }}>
                {r.priceRange}
              </Box>
            )}
            {canEdit && onToggleFavorite ? (
              <IconButton
                onClick={() => onToggleFavorite(r)}
                aria-label={tr(r.favorite ? 'dashboard.unfavorite' : 'dashboard.favorite', { name: r.name })}
                aria-pressed={r.favorite ?? false}
                sx={{ color: r.favorite ? '#C0492B' : t.muted }}
              >
                {r.favorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            ) : r.favorite ? (
              <Favorite role="img" aria-label={tr('dashboard.favorited')} sx={{ color: '#C0492B' }} />
            ) : null}
          </Box>
        </Box>

        {/* Rating */}
        <Box sx={{ mt: '8px', minHeight: 20 }}>
          {rating > 0 ? (
            <Stars value={r.rating ?? 0} tokens={t} size={17} />
          ) : (
            <Box component="span" sx={{ color: t.notRated, fontSize: 13, fontStyle: 'italic' }}>
              {tr('detail.notRated')}
            </Box>
          )}
        </Box>

        {/* Times visited */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', mt: '10px' }}>
          <Box component="span" sx={{ color: t.muted, fontSize: 13.5 }}>
            {tr('detail.visitedTimes', { count: r.visitCount ?? 0 })}
          </Box>
          {canEdit && onAddVisit && (
            <IconButton
              size="small"
              onClick={() => onAddVisit(r)}
              aria-label={tr('detail.addVisit')}
              title={tr('detail.addVisit')}
              sx={{
                color: t.accent,
                border: `1px solid ${t.pillBorder}`,
                p: '3px',
                '&:hover': { borderColor: t.accent, background: 'transparent' },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
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

        {/* Enrichment tabs — reservations · hours · instagram · guides */}
        <Box sx={{ mt: '18px' }}>
          <Tabs
            value={tab}
            onChange={(_, v: 'reservations' | 'hours' | 'instagram' | 'guides') => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label={tr('detail.tabsLabel')}
            sx={{ borderBottom: `1px solid ${t.border}`, minHeight: 40, '& .MuiTabs-indicator': { backgroundColor: t.accent } }}
          >
            <Tab value="reservations" label={tr('detail.tabReservations')} sx={tabSx} />
            <Tab value="hours" label={tr('detail.tabHours')} sx={tabSx} />
            <Tab value="instagram" label={tr('detail.tabInstagram')} sx={tabSx} />
            <Tab value="guides" label={tr('detail.tabGuides')} sx={tabSx} />
          </Tabs>

          <Box sx={{ pt: '14px' }}>
            {tab === 'reservations' && (
              <Box>
                {/* The location switcher lives OUTSIDE the has-details branch:
                    selecting a detail-less branch must never remove the tabs
                    (that trapped the user on the empty branch). */}
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
                        sx={{ minHeight: 36, textTransform: 'none', color: t.muted, '&.Mui-selected': { color: t.ink } }}
                      />
                    ))}
                  </Tabs>
                )}
                {loc.address || loc.phone || loc.email || loc.reservationUrl || loc.reservationPlatform === 'walkin' ? (
                <Box>
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
                ) : (
                  emptyTab(tr('detail.reservationsEmpty'))
                )}
              </Box>
            )}

            {tab === 'hours' && emptyTab(tr('detail.hoursEmpty'))}

            {tab === 'instagram' &&
              (hasLinks ? (
                <Box sx={{ display: 'flex', gap: '4px' }}>
                  {r.url && (
                    <IconButton component="a" href={r.url} target="_blank" rel="noopener noreferrer" aria-label={tr('form.websiteUrl')} sx={{ color: t.muted }}>
                      <Language fontSize="small" />
                    </IconButton>
                  )}
                  {r.socialMedia?.instagram && (
                    <IconButton component="a" href={r.socialMedia.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" sx={{ color: t.muted }}>
                      <Instagram fontSize="small" />
                    </IconButton>
                  )}
                  {r.socialMedia?.facebook && (
                    <IconButton component="a" href={r.socialMedia.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" sx={{ color: t.muted }}>
                      <Facebook fontSize="small" />
                    </IconButton>
                  )}
                  {r.socialMedia?.twitter && (
                    <IconButton component="a" href={r.socialMedia.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" sx={{ color: t.muted }}>
                      <Twitter fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ) : (
                emptyTab(tr('detail.socialEmpty'))
              ))}

            {tab === 'guides' && emptyTab(tr('detail.guidesEmpty'))}
          </Box>
        </Box>

        {/* Comment / notes */}
        {r.comment && (
          <Box sx={{ mt: '18px' }}>
            <Box component="span" sx={sectionLabel}>{tr('form.notes')}</Box>
            <Box sx={{ color: t.ink, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.comment}</Box>
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
