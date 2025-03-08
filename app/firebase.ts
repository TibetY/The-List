// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQAmhnMzFKR-xsemZvCY6Td-tyKZKOD-E",
  authDomain: "the-list-aa9d3.firebaseapp.com",
  projectId: "the-list-aa9d3",
  storageBucket: "the-list-aa9d3.firebasestorage.app",
  messagingSenderId: "952626686091",
  appId: "1:952626686091:web:1a70f06bdab8870e5ecc8e",
  measurementId: "G-HZVZKTW6LN"
};

// Check if any Firebase apps have been initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
