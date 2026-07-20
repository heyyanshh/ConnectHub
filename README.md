# ConnectHub - Smart Contact Management & Real-Time Chat

A complete, production-quality desktop application built for a B.Tech 3rd Year DSA Project. It combines advanced contact management with real-time chat capabilities.

## Features

- **Robust Contact Management**: Add, edit, delete, and categorize contacts with extensive input validation.
- **Real-Time Chat**: Send text and file attachments instantly using a lightweight Socket.IO implementation.
- **DSA Implementations**: Employs efficient data structures (`std::vector`) and algorithms (Linear Search, Binary Search, Quick Sort variations, Custom Filtering) to manage contacts efficiently.
- **Modern Dark UI**: Features a sleek, responsive card-based dark theme utilizing Qt stylesheets and shadow effects.
- **Async Networking**: High-performance asynchronous HTTP REST requests using `QNetworkAccessManager`.
- **WebSocket Protocol**: Custom EIO v4 Handshake over standard WebSockets for reliable bi-directional communication.

## Tech Stack

### Client (Desktop App)
- **Language**: Modern C++17
- **Framework**: Qt 6 (Widgets, Network, WebSockets)
- **Build System**: CMake

### Backend (Server)
- **Environment**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: MongoDB (Mongoose)

## Project Structure
```
ConnectHub/
├── Client/
│   ├── Chat/          # Chat UI, input bar, message bubbles
│   ├── Contacts/      # Contact list, search/sort algorithms, dialogs
│   ├── Dashboard/     # Statistics and quick actions
│   ├── LoginWindow/   # User setup and registration
│   ├── Models/        # Data structures (User, Contact, Message)
│   ├── Profile/       # Local user profile management
│   ├── Resources/     # Stylesheets (QSS) and icons
│   ├── Settings/      # App configuration
│   ├── SplashScreen/  # Startup animation
│   └── Utils/         # Networking, Socket management, DSA Algorithms
├── Server/
│   ├── controllers/   # Express route handlers
│   ├── middleware/    # Input validation and error handling
│   ├── models/        # MongoDB schemas
│   ├── routes/        # API endpoints definitions
│   ├── uploads/       # Directory for chat attachments
│   ├── db.js          # MongoDB connection logic
│   ├── server.js      # Main Express application
│   └── socketHandler.js # Real-time Socket.IO events
└── CMakeLists.txt     # Build configuration for C++ client
```

## How to Build & Run

### 1. Setup Backend
1. Navigate to the `Server` directory:
   ```bash
   cd Server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server (ensure MongoDB is running locally on port 27017):
   ```bash
   npm start
   ```
   *The server will run on `http://localhost:3000`.*

### 2. Build Client
1. Ensure you have CMake and Qt 6 installed on your system.
2. From the root `ConnectHub` directory, create a build folder:
   ```bash
   mkdir build && cd build
   ```
3. Generate build files with CMake:
   ```bash
   cmake ..
   ```
4. Compile the application:
   ```bash
   cmake --build .
   ```
5. Run the executable:
   - **Windows**: `Debug\ConnectHub.exe`
   - **macOS**: `ConnectHub.app/Contents/MacOS/ConnectHub`
   - **Linux**: `./ConnectHub`

## DSA Implementation Details
- All collections utilize `std::vector` to satisfy core DSA requirements while maintaining contiguous memory access.
- **SearchSort.cpp** implements:
  - `linearSearch`: O(n) textual matching across contact names, emails, and phones.
  - `binarySearch`: O(log n) lookup (when data is pre-sorted).
  - `sortContacts`: O(n log n) sorting with custom comparators (Alphabetical, Category, Favorites, Chronological).
  - Filtering utilizing `std::copy_if` for status and categories.
