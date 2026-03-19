import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Chip,
  Rating,
  Tooltip,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Language from '@mui/icons-material/Language';
import Facebook from '@mui/icons-material/Facebook';
import Instagram from '@mui/icons-material/Instagram';
import Twitter from '@mui/icons-material/Twitter';
import type { Restaurant } from '~/types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
}

export default function RestaurantCard({
  restaurant,
  onEdit,
  onDelete,
}: RestaurantCardProps) {
  const defaultImage =
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
        <rect fill="#1a1a2e" width="400" height="200"/>
        <text fill="#4a4a5a" font-family="system-ui" font-size="16" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text>
      </svg>`
    );

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
      role="article"
      aria-label={`${restaurant.name} restaurant card`}
    >
      {/* Image with overlay gradient */}
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <CardMedia
          component="img"
          height="200"
          image={restaurant.image || defaultImage}
          alt={`Photo of ${restaurant.name}`}
          sx={{
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
            '.MuiCard-root:hover &': {
              transform: 'scale(1.05)',
            },
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
            background:
              'linear-gradient(to top, rgba(10,10,15,0.9) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Price range badge */}
        {restaurant.priceRange && (
          <Chip
            label={restaurant.priceRange}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              color: '#22C55E',
              fontWeight: 700,
              fontSize: '0.8rem',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        )}

        {/* Rating overlay on image */}
        {restaurant.rating !== undefined && restaurant.rating > 0 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Rating
              value={restaurant.rating}
              readOnly
              size="small"
              precision={0.5}
              aria-label={`Rating: ${restaurant.rating} out of 5`}
            />
          </Box>
        )}
      </Box>

      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
          '&:last-child': { pb: 2.5 },
        }}
      >
        {/* Name + Actions */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontWeight: 700,
              fontSize: '1.05rem',
              lineHeight: 1.3,
              flexGrow: 1,
              pr: 1,
            }}
          >
            {restaurant.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0, ml: 1 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(restaurant)}
                aria-label={`Edit ${restaurant.name}`}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => restaurant.id && onDelete(restaurant.id)}
                aria-label={`Delete ${restaurant.name}`}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Cuisine chip */}
        {restaurant.cuisineType && (
          <Chip
            label={restaurant.cuisineType}
            size="small"
            sx={{
              alignSelf: 'flex-start',
              mb: 1.5,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: '#818CF8',
              fontWeight: 500,
              fontSize: '0.75rem',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          />
        )}

        {/* Comment */}
        {restaurant.comment && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 1.5,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {restaurant.comment}
          </Typography>
        )}

        {/* Social links */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto', pt: 1 }}>
          {restaurant.url && (
            <Tooltip title="Website">
              <IconButton
                size="small"
                component="a"
                href={restaurant.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${restaurant.name} website`}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <Language fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {restaurant.socialMedia?.facebook && (
            <Tooltip title="Facebook">
              <IconButton
                size="small"
                component="a"
                href={restaurant.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${restaurant.name} on Facebook`}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: '#1877F2' },
                }}
              >
                <Facebook fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {restaurant.socialMedia?.instagram && (
            <Tooltip title="Instagram">
              <IconButton
                size="small"
                component="a"
                href={restaurant.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${restaurant.name} on Instagram`}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: '#E4405F' },
                }}
              >
                <Instagram fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {restaurant.socialMedia?.twitter && (
            <Tooltip title="Twitter / X">
              <IconButton
                size="small"
                component="a"
                href={restaurant.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${restaurant.name} on Twitter`}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: '#1DA1F2' },
                }}
              >
                <Twitter fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
