import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Chip,
  Rating,
  Link,
} from '@mui/material';
import { Edit, Delete, Language, Facebook, Instagram, Twitter } from '@mui/icons-material';
import type { Restaurant } from '~/types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
}

export default function RestaurantCard({ restaurant, onEdit, onDelete }: RestaurantCardProps) {
  const defaultImage = 'https://via.placeholder.com/400x200?text=No+Image';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="200"
        image={restaurant.image || defaultImage}
        alt={restaurant.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {restaurant.name}
          </Typography>
          <Box>
            <IconButton size="small" onClick={() => onEdit(restaurant)} color="primary">
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => restaurant.id && onDelete(restaurant.id)}
              color="error"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {restaurant.cuisineType && (
          <Chip label={restaurant.cuisineType} size="small" sx={{ mb: 1 }} />
        )}

        {restaurant.rating !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Rating value={restaurant.rating} readOnly size="small" precision={0.5} />
            {restaurant.priceRange && (
              <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                {restaurant.priceRange}
              </Typography>
            )}
          </Box>
        )}

        {restaurant.comment && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {restaurant.comment}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
          {restaurant.url && (
            <IconButton
              size="small"
              component="a"
              href={restaurant.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Language fontSize="small" />
            </IconButton>
          )}
          {restaurant.socialMedia?.facebook && (
            <IconButton
              size="small"
              component="a"
              href={restaurant.socialMedia.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook fontSize="small" />
            </IconButton>
          )}
          {restaurant.socialMedia?.instagram && (
            <IconButton
              size="small"
              component="a"
              href={restaurant.socialMedia.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram fontSize="small" />
            </IconButton>
          )}
          {restaurant.socialMedia?.twitter && (
            <IconButton
              size="small"
              component="a"
              href={restaurant.socialMedia.twitter}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter fontSize="small" />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
