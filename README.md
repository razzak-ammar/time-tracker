# TimeTracker - Simple Time Tracking App

A minimalist time tracking application built with Next.js, Firebase, and shadcn/ui. Track your time across different organizations with a clean, iOS/Notion-inspired interface.

## Features

- 🔐 **Authentication**: Email/password authentication with Firebase Auth
- 🏢 **Organizations**: Create and manage different organizations/projects
- 📌 **Pinned Organizations**: Pin frequently used organizations for quick access
- ⏱️ **Real-time Tracking**: Start/stop time tracking with live elapsed time display
- 📝 **Time Entries**: View, edit, and manage all your time entries
- 🎨 **Dark Mode**: Beautiful dark/light theme toggle
- 📱 **Mobile Responsive**: Works perfectly on desktop and mobile devices
- 🔄 **Offline Support**: Basic offline capabilities with service worker
- 📊 **Statistics**: View your time tracking statistics and insights

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd time-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Email/Password
   - Create a Firestore database
   - Get your Firebase configuration

4. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Creating Organizations
1. Click "Add Organization" on the dashboard
2. Enter a name and choose a color
3. Click "Create"

### Tracking Time
1. Click the "Start" button on any organization card
2. The timer will begin tracking your time
3. Click "Stop" when you're done

### Managing Time Entries
1. Navigate to "Time Entries" in the sidebar
2. View all your time entries with filtering options
3. Click the edit icon to modify start/end times or add descriptions

### Pinning Organizations
1. Click the pin icon on any organization card
2. Pinned organizations appear at the top of your dashboard

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication page
│   ├── dashboard/         # Main dashboard
│   └── time-entries/      # Time entries list
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── layout/           # Layout components
│   ├── organizations/    # Organization components
│   ├── time-entries/     # Time entry components
│   └── ui/               # shadcn/ui components
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Utility functions and Firebase config
└── types/                # TypeScript type definitions
```

## Firebase Setup

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Organizations
    match /organizations/{orgId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Time Entries
    match /timeEntries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
