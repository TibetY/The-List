# The List 🍽️

> **Discover. Taste. Remember.**

A beautiful, modern web application for managing your personal restaurant collection. Keep track of your favorite dining spots, rate your experiences, and share your curated list with friends.

![Built with Remix](https://img.shields.io/badge/Built%20with-Remix-000000?style=for-the-badge&logo=remix)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Material-UI](https://img.shields.io/badge/MUI-007FFF?style=for-the-badge&logo=mui&logoColor=white)

---

## ✨ Features

### 🏪 Restaurant Management
- **Full CRUD Operations**: Create, read, update, and delete restaurants with ease
- **Rich Details**: Store comprehensive information about each restaurant:
  - Name and photos
  - Website URLs
  - Social media links (Facebook, Instagram, Twitter, TikTok)
  - Personal ratings (0-5 stars with half-star precision)
  - Price range ($, $$, $$$, $$$$)
  - Cuisine types (Italian, Chinese, Japanese, Mexican, and more)
  - Personal notes and comments

### 📸 Image Management
- Upload restaurant photos
- Automatic image optimization and storage
- Preview images before uploading
- Fallback placeholders for restaurants without images

### 📧 Sharing & Export
- Email your restaurant list to friends
- Formatted text export with all details
- One-click sharing via your default email client

### 🎨 Beautiful UI/UX
- Modern Material Design components
- Responsive grid layout (works on desktop, tablet, and mobile)
- Dark theme with custom accent colors
- Real-time notifications and feedback
- Smooth animations and transitions

### 🔐 Secure Authentication
- Firebase Authentication integration
- Email/password sign-up and login
- Protected routes and user-specific data
- Session-based authentication with secure cookies

---

## 🛠️ Tech Stack

### Frontend
- **[Remix](https://remix.run/)** - Full-stack React framework
- **[React](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Material-UI (MUI)](https://mui.com/)** - Component library
- **[Emotion](https://emotion.sh/)** - CSS-in-JS styling
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS

### Backend & Services
- **[Firebase Authentication](https://firebase.google.com/products/auth)** - User authentication
- **[Cloud Firestore](https://firebase.google.com/products/firestore)** - NoSQL database
- **[Firebase Storage](https://firebase.google.com/products/storage)** - Image storage
- **[Node.js](https://nodejs.org/)** (v20+) - Runtime environment

### Build Tools
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[ESLint](https://eslint.org/)** - Code linting

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** or **yarn**
- **Firebase account** (free tier is sufficient)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TibetY/The-List.git
   cd The-List
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**

   Update `app/firebase.ts` with your Firebase configuration:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```

4. **Set up Firestore Database**
   - Go to Firebase Console
   - Create a Firestore database
   - Start in **production mode** or configure security rules:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /restaurants/{restaurant} {
           allow read, write: if request.auth != null &&
                                 request.auth.uid == resource.data.userId;
           allow create: if request.auth != null;
         }
       }
     }
     ```

5. **Set up Firebase Storage**
   - Enable Firebase Storage in console
   - Configure storage rules:
     ```javascript
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /restaurants/{userId}/{allPaths=**} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
     ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**

   Navigate to `http://localhost:5173`

---

## 📖 Usage Guide

### Creating an Account
1. Navigate to the signup page
2. Enter your email and password
3. Click "Sign Up" to create your account

### Adding a Restaurant
1. Log in to your dashboard
2. Click the **"Add Restaurant"** button
3. Fill in the restaurant details:
   - Name (required)
   - Cuisine type
   - Price range
   - Rating
   - Website URL
   - Social media links
   - Personal notes
4. Upload a photo (optional)
5. Click **"Add"** to save

### Editing a Restaurant
1. Click the **edit icon** (pencil) on any restaurant card
2. Update the desired fields
3. Click **"Update"** to save changes

### Deleting a Restaurant
1. Click the **delete icon** (trash) on any restaurant card
2. Confirm the deletion in the dialog
3. The restaurant will be permanently removed

### Sharing Your List
1. Click **"Email List"** in the top navigation bar
2. Enter the recipient's email address
3. Your email client will open with a formatted list
4. Add any additional message and send

---

## 📁 Project Structure

```
The-List/
├── app/
│   ├── components/           # React components
│   │   ├── DeleteConfirmDialog.tsx
│   │   ├── EmailDialog.tsx
│   │   ├── Logo.tsx
│   │   ├── Navbar.tsx
│   │   ├── RestaurantCard.tsx
│   │   └── RestaurantFormDialog.tsx
│   ├── routes/              # Remix routes
│   │   ├── _index.tsx       # Landing page
│   │   ├── dashboard/       # Protected dashboard
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   └── logout/          # Logout handler
│   ├── services/            # Business logic
│   │   ├── email.client.ts
│   │   ├── restaurants.server.ts
│   │   └── storage.client.ts
│   ├── types/               # TypeScript types
│   │   └── restaurant.ts
│   ├── firebase.ts          # Firebase configuration
│   ├── session.server.ts    # Session management
│   ├── theme.ts             # MUI theme
│   └── root.tsx             # Root layout
├── public/                  # Static assets
├── build/                   # Production build
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Dependencies
```

---

## 🎯 Key Features Explained

### Restaurant Data Model

Each restaurant entry includes:

```typescript
interface Restaurant {
  id?: string;
  name: string;
  image?: string;
  url?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  rating?: number;        // 0-5
  priceRange?: string;    // $, $$, $$$, $$$$
  comment?: string;
  cuisineType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId: string;
}
```

### Security Features

- **User Isolation**: Each user can only view and modify their own restaurants
- **Protected Routes**: Dashboard requires authentication
- **Secure Sessions**: HTTP-only cookies with 1-hour expiration
- **Firebase Rules**: Server-side validation via Firestore security rules

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript compiler check
```

---

## 🌟 Future Enhancements

- [ ] Google OAuth integration
- [ ] Advanced filtering and search
- [ ] Restaurant categories and tags
- [ ] Map integration for location tracking
- [ ] Export to PDF
- [ ] Collaborative lists (share with friends)
- [ ] Restaurant recommendations
- [ ] Visit history tracking
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

Built with ❤️ by the Remix and Firebase communities

---

## 🙏 Acknowledgments

- [Remix Documentation](https://remix.run/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Material-UI Components](https://mui.com/components/)
- [React Documentation](https://react.dev/)

---

<div align="center">
  <strong>Happy Restaurant Hunting! 🍕🍜🍔</strong>
</div>
