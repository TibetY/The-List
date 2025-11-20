import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '~/firebase';
import type { Restaurant } from '~/types/restaurant';

const COLLECTION_NAME = 'restaurants';

export async function createRestaurant(
  restaurantData: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...restaurantData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateRestaurant(
  id: string,
  restaurantData: Partial<Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>,
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...restaurantData,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteRestaurant(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getRestaurantsByUser(userId: string): Promise<Restaurant[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  const querySnapshot = await getDocs(q);
  const restaurants: Restaurant[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    restaurants.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Restaurant);
  });

  return restaurants;
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
  );

  const restaurants: Restaurant[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    restaurants.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Restaurant);
  });

  return restaurants;
}
