import { useState, useEffect } from 'react';
import { LoaderFunction, ActionFunction, redirect, json } from '@remix-run/node';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Email from '@mui/icons-material/Email';
import Logout from '@mui/icons-material/Logout';
import Search from '@mui/icons-material/Search';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { getSession, destroySession } from '~/session.server';
import { getRestaurantsByUser } from '~/services/restaurants.server';
import type { Restaurant } from '~/types/restaurant';
import RestaurantCard from '~/components/RestaurantCard';
import RestaurantFormDialog from '~/components/RestaurantFormDialog';
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog';
import EmailDialog from '~/components/EmailDialog';
import { uploadRestaurantImage } from '~/services/storage.client';
import { sendRestaurantListViaMailto } from '~/services/email.client';
import Logo from '~/components/Logo';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '~/firebase';

type LoaderData = {
  restaurants: Restaurant[];
  userId: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('token');
  const userId = session.get('userId');

  if (!token || !userId) {
    return redirect('/login');
  }

  try {
    const restaurants = await getRestaurantsByUser(userId);
    return json<LoaderData>({ restaurants, userId });
  } catch (error) {
    console.error('Error loading restaurants:', error);
    return json<LoaderData>({ restaurants: [], userId });
  }
};

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'logout') {
    return redirect('/login', {
      headers: {
        'Set-Cookie': await destroySession(session),
      },
    });
  }

  return json({ success: true });
};

export default function Dashboard() {
  const { restaurants: initialRestaurants, userId } = useLoaderData<LoaderData>();
  const revalidator = useRevalidator();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCuisine, setFilterCuisine] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  // Filtered restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisineType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCuisine = !filterCuisine || r.cuisineType === filterCuisine;
    return matchesSearch && matchesCuisine;
  });

  // Get unique cuisine types for filter chips
  const cuisineTypes = [
    ...new Set(restaurants.map((r) => r.cuisineType).filter(Boolean)),
  ] as string[];

  const handleAddRestaurant = () => {
    setSelectedRestaurant(null);
    setFormOpen(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormOpen(true);
  };

  const handleSaveRestaurant = async (
    restaurantData: Partial<Restaurant>,
    imageFile?: File
  ) => {
    try {
      let imageUrl = restaurantData.image;

      if (imageFile) {
        imageUrl = await uploadRestaurantImage(imageFile, userId);
      }

      const dataToSave = {
        ...restaurantData,
        image: imageUrl,
        userId,
      };

      if (selectedRestaurant?.id) {
        const docRef = doc(db, 'restaurants', selectedRestaurant.id);
        await updateDoc(docRef, {
          ...dataToSave,
          updatedAt: Timestamp.now(),
        });

        setSnackbar({
          open: true,
          message: 'Restaurant updated successfully!',
          severity: 'success',
        });
      } else {
        await addDoc(collection(db, 'restaurants'), {
          ...dataToSave,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        setSnackbar({
          open: true,
          message: 'Restaurant added successfully!',
          severity: 'success',
        });
      }

      revalidator.revalidate();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving restaurant:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save restaurant. Please try again.',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleDeleteClick = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setRestaurantToDelete({ id, name: restaurant.name });
      setDeleteOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!restaurantToDelete) return;

    try {
      const docRef = doc(db, 'restaurants', restaurantToDelete.id);
      await deleteDoc(docRef);

      setSnackbar({
        open: true,
        message: 'Restaurant deleted successfully!',
        severity: 'success',
      });

      revalidator.revalidate();
      setDeleteOpen(false);
      setRestaurantToDelete(null);
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete restaurant. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleEmailList = () => {
    setEmailOpen(true);
  };

  const handleSendEmail = async (email: string) => {
    sendRestaurantListViaMailto(restaurants, email);
    setSnackbar({
      open: true,
      message: 'Opening email client...',
      severity: 'success',
    });
  };

  const handleLogout = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'intent';
    input.value = 'logout';
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Dashboard App Bar */}
      <AppBar
        position="fixed"
        component="nav"
        aria-label="Dashboard navigation"
      >
        <Toolbar
          sx={{
            maxWidth: '1400px',
            width: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Logo />
            {!isMobile && (
              <Chip
                icon={<RestaurantIcon sx={{ fontSize: 16 }} />}
                label={`${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(232, 115, 74, 0.12)',
                  color: '#E8734A',
                  fontWeight: 600,
                  border: '1px solid rgba(232, 115, 74, 0.2)',
                }}
              />
            )}
          </Box>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                PaperProps={{
                  sx: {
                    width: 280,
                    background: '#141420',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                  <IconButton
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    sx={{ color: 'text.primary' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <List>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        handleAddRestaurant();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <ListItemIcon sx={{ color: '#E8734A', minWidth: 40 }}>
                        <Add />
                      </ListItemIcon>
                      <ListItemText primary="Add Restaurant" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        handleEmailList();
                        setMobileMenuOpen(false);
                      }}
                      disabled={restaurants.length === 0}
                    >
                      <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}>
                        <Email />
                      </ListItemIcon>
                      <ListItemText primary="Email List" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                      <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}>
                        <Logout />
                      </ListItemIcon>
                      <ListItemText primary="Sign Out" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Drawer>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddRestaurant}
                size="small"
              >
                Add Restaurant
              </Button>
              <Tooltip title="Email your list">
                <IconButton
                  color="inherit"
                  onClick={handleEmailList}
                  disabled={restaurants.length === 0}
                  aria-label="Email restaurant list"
                >
                  <Email />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sign out">
                <IconButton
                  color="inherit"
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <Logout />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container
        maxWidth="lg"
        sx={{ pt: { xs: 10, sm: 12 }, pb: 6, px: { xs: 2, sm: 3 } }}
      >
        {/* Header + Search */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              mb: 1,
              fontSize: { xs: '1.8rem', sm: '2.4rem' },
              letterSpacing: '-0.02em',
            }}
          >
            My Collection
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', mb: 3 }}
          >
            Your curated list of restaurants worth remembering.
          </Typography>

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search restaurants, cuisines, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            aria-label="Search restaurants"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 500,
              mb: 2,
            }}
          />

          {/* Cuisine filter chips */}
          {cuisineTypes.length > 0 && (
            <Box
              sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
              role="group"
              aria-label="Filter by cuisine type"
            >
              <Chip
                label="All"
                size="small"
                onClick={() => setFilterCuisine(null)}
                variant={filterCuisine === null ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  ...(filterCuisine === null
                    ? {
                        backgroundColor: 'rgba(232, 115, 74, 0.15)',
                        color: '#E8734A',
                        border: '1px solid rgba(232, 115, 74, 0.3)',
                      }
                    : {
                        borderColor: 'rgba(255,255,255,0.15)',
                      }),
                }}
              />
              {cuisineTypes.map((cuisine) => (
                <Chip
                  key={cuisine}
                  label={cuisine}
                  size="small"
                  onClick={() =>
                    setFilterCuisine(filterCuisine === cuisine ? null : cuisine)
                  }
                  variant={filterCuisine === cuisine ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 500,
                    ...(filterCuisine === cuisine
                      ? {
                          backgroundColor: 'rgba(232, 115, 74, 0.15)',
                          color: '#E8734A',
                          border: '1px solid rgba(232, 115, 74, 0.3)',
                        }
                      : {
                          borderColor: 'rgba(255,255,255,0.1)',
                        }),
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Restaurant Grid */}
        {filteredRestaurants.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: { xs: 6, sm: 10 },
              px: 3,
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <RestaurantIcon
              sx={{
                fontSize: 48,
                color: 'text.secondary',
                mb: 2,
                opacity: 0.5,
              }}
            />
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, mb: 1 }}
            >
              {searchQuery || filterCuisine
                ? 'No matches found'
                : 'No restaurants yet'}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', mb: 4, maxWidth: 400, mx: 'auto' }}
            >
              {searchQuery || filterCuisine
                ? 'Try adjusting your search or filter.'
                : 'Start building your list by adding your favorite restaurants!'}
            </Typography>
            {!searchQuery && !filterCuisine && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddRestaurant}
                size="large"
              >
                Add Your First Restaurant
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredRestaurants.map((restaurant, index) => (
              <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
                <Box
                  className="animate-fade-in-up"
                  sx={{ animationDelay: `${index * 60}ms` }}
                >
                  <RestaurantCard
                    restaurant={restaurant}
                    onEdit={handleEditRestaurant}
                    onDelete={handleDeleteClick}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Mobile FAB */}
        {isMobile && (
          <Button
            variant="contained"
            onClick={handleAddRestaurant}
            aria-label="Add restaurant"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 60,
              height: 60,
              minWidth: 'unset',
              borderRadius: '50%',
              boxShadow: '0 8px 24px rgba(232, 115, 74, 0.4)',
              zIndex: 1000,
            }}
          >
            <Add sx={{ fontSize: 28 }} />
          </Button>
        )}
      </Container>

      {/* Dialogs */}
      <RestaurantFormDialog
        open={formOpen}
        restaurant={selectedRestaurant}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveRestaurant}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        restaurantName={restaurantToDelete?.name || ''}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
      <EmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        onSend={handleSendEmail}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
