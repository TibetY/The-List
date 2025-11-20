import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '~/firebase';

/**
 * Upload an image to Firebase Storage
 * @param file The image file to upload
 * @param userId The user ID to organize files
 * @returns The download URL of the uploaded image
 */
export async function uploadRestaurantImage(file: File, userId: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `restaurants/${userId}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl The full URL of the image to delete
 */
export async function deleteRestaurantImage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the URL
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - image might already be deleted
  }
}
