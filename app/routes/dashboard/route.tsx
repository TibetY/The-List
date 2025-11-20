import { useState, useEffect } from 'react';
import { LoaderFunction, ActionFunction, redirect, json } from '@remix-run/node';
import { useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
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
} from '@mui/material';
import { Add, Email, Logout } from '@mui/icons-material';
import { getSession, destroySession } from '~/session.server';
import { getRestaurantsByUser } from '~/services/restaurants.server';
import type { Restaurant } from '~/types/restaurant';
import RestaurantCard from '~/components/RestaurantCard';
import RestaurantFormDialog from '~/components/RestaurantFormDialog';
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog';
import EmailDialog from '~/components/EmailDialog';
import { uploadRestaurantImage } from '~/services/storage.client';
import { sendRestaurantListViaMailto } from '~/services/email.client';

// Import Firebase on client-side for real-time operations
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

  // If there's no token, redirect to login.
  if (!token) {
    return redirect('/login');
  }

  // If no userId in session, redirect to login (they need to re-login)
  if (!userId) {
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
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{ id: string; name: string } | null>(
    null
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Update restaurants when loader data changes
  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

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

      // Upload image if provided
      if (imageFile) {
        imageUrl = await uploadRestaurantImage(imageFile, userId);
      }

      const dataToSave = {
        ...restaurantData,
        image: imageUrl,
        userId,
      };

      if (selectedRestaurant?.id) {
        // Update existing restaurant
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
        // Add new restaurant
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

      // Refresh the data
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

      // Refresh the data
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
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            The List - My Restaurants
          </Typography>
          <Button
            color="inherit"
            startIcon={<Email />}
            onClick={handleEmailList}
            disabled={restaurants.length === 0}
            sx={{ mr: 2 }}
          >
            Email List
          </Button>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Restaurant Collection
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddRestaurant} size="large">
            Add Restaurant
          </Button>
        </Box>

        {restaurants.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: 'background.paper',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No restaurants yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start building your list by adding your favorite restaurants!
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddRestaurant}>
              Add Your First Restaurant
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {restaurants.map((restaurant) => (
              <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
                <RestaurantCard
                  restaurant={restaurant}
                  onEdit={handleEditRestaurant}
                  onDelete={handleDeleteClick}
                />
              </Grid>
            ))}
          </Grid>
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
