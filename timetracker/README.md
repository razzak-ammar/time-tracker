# TimeTracker - macOS App

A beautiful, native macOS time tracking application built with SwiftUI and Firebase. Track your time across multiple projects with a clean, minimalist interface.

## Features

- 🔐 **Firebase Authentication** - Secure sign-in and sign-up
- 📊 **Real-time Dashboard** - Live updates of active timers and project statistics
- 📁 **Project Management** - Create, edit, and organize projects with custom colors
- ⏱️ **Time Tracking** - Start/stop timers with real-time elapsed time display
- 📝 **Time Entries** - Detailed view of all time entries with filtering and search
- 📌 **Pinned Projects** - Quick access to frequently used projects
- 🎨 **Beautiful UI** - Clean, modern macOS-native interface with light mode design
- 🔄 **Real-time Sync** - All data syncs in real-time across devices via Firebase

## Screenshots

The app features a clean, minimalist design with:
- Sidebar navigation with Dashboard, Projects, and Time Entries
- Active timer display with real-time updates
- Project cards with color coding
- Detailed time entry views with filtering
- Beautiful authentication screens

## Setup Instructions

### Prerequisites

- macOS 13.0 or later
- Xcode 15.0 or later
- Firebase project with Firestore database

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use your existing one
3. Enable Authentication with Email/Password
4. Create a Firestore database
5. Set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /timeEntries/{timeEntryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 2. Firebase Configuration

1. In Firebase Console, go to Project Settings
2. Add a new iOS app to your project
3. Download the `GoogleService-Info.plist` file
4. Replace the placeholder `GoogleService-Info.plist` in the project with your actual configuration file

### 3. Xcode Setup

1. Open `timetracker.xcodeproj` in Xcode
2. Add Firebase dependencies using Swift Package Manager:
   - Go to File → Add Package Dependencies
   - Add these packages:
     - `https://github.com/firebase/firebase-ios-sdk.git`
   - Select these products:
     - FirebaseAuth
     - FirebaseFirestore
3. Build and run the project

### 4. Project Structure

```
timetracker/
├── Models.swift              # Data models (Project, TimeEntry, UserProfile)
├── FirebaseService.swift     # Firebase operations and real-time listeners
├── TimeTrackingViewModel.swift # Main view model with business logic
├── ContentView.swift         # Main app view with authentication routing
├── AuthView.swift           # Authentication screens
├── DashboardView.swift      # Main dashboard with sidebar navigation
├── ProjectsView.swift       # Project management
├── TimeEntriesView.swift    # Time entries list and filtering
└── GoogleService-Info.plist # Firebase configuration (replace with your own)
```

## Usage

### Authentication
- Sign up with email and password
- Sign in with existing credentials
- Automatic session persistence

### Dashboard
- View active timer with real-time updates
- See pinned projects for quick access
- View recent time entries
- Start tracking from project cards

### Projects
- Create new projects with custom names and colors
- Edit project details
- Pin/unpin projects for quick access
- Delete projects (with confirmation)
- View project statistics

### Time Entries
- View all time entries with detailed information
- Filter by project, date range, or search terms
- Edit entry descriptions
- Stop active timers
- View total time summaries

## Data Structure

The app uses the same Firebase collections as your web app:

### Projects Collection
```javascript
{
  id: "string",
  name: "string",
  color: "string (hex)",
  userId: "string",
  isPinned: "boolean",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

### Time Entries Collection
```javascript
{
  id: "string",
  projectId: "string",
  userId: "string",
  startTime: "timestamp",
  endTime: "timestamp (optional)",
  description: "string (optional)",
  isActive: "boolean",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

## Design Philosophy

The app follows macOS design guidelines with:
- **Minimalist Interface** - Clean, uncluttered design focusing on content
- **Light Mode** - Fresh, modern appearance with subtle shadows and borders
- **Native Feel** - Uses standard macOS UI components and patterns
- **Responsive Layout** - Adapts to different window sizes
- **Accessibility** - Proper contrast ratios and semantic markup

## Development

### Architecture
- **MVVM Pattern** - Clean separation of concerns
- **ObservableObject** - Reactive UI updates
- **Async/Await** - Modern concurrency for Firebase operations
- **Real-time Listeners** - Live data synchronization

### Key Components
- `TimeTrackingViewModel` - Central state management
- `FirebaseService` - Firebase operations abstraction
- `NavigationSplitView` - macOS-native sidebar navigation
- Custom color extensions for hex color support

## Troubleshooting

### Common Issues

1. **Firebase not connecting**
   - Ensure `GoogleService-Info.plist` is properly configured
   - Check Firebase project settings and API keys
   - Verify Firestore security rules

2. **Build errors**
   - Clean build folder (Cmd+Shift+K)
   - Reset package caches
   - Ensure all Firebase dependencies are added

3. **Authentication issues**
   - Verify Email/Password authentication is enabled in Firebase
   - Check network connectivity
   - Ensure proper error handling in console

## Contributing

This is a native macOS port of your existing web application. The app maintains feature parity while providing a native macOS experience.

## License

This project is part of your time tracking application suite.
