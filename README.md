# CampusCrew 🎓

A comprehensive event management platform designed for campus communities, enabling students to discover, create, and participate in campus events seamlessly.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

CampusCrew is a full-stack web application that bridges the gap between event organizers and participants in campus environments. The platform provides an intuitive interface for creating, managing, and discovering events while incorporating features like payment processing, certificate generation, and intelligent event recommendations.

## ✨ Features

### For Users
- **User Authentication**: Secure signup, login, and email verification
- **Event Discovery**: Browse upcoming campus events with filtering options
- **Event Registration**: Register for events with integrated payment processing (bKash)
- **Dashboard**: Personal dashboard to track joined events and activities
- **Certificate Generation**: Automated certificate generation for completed events
- **Profile Management**: Comprehensive user profile with customization options
- **Recommendation System**: Intelligent event suggestions based on user preferences

### For Event Organizers
- **Event Creation**: Comprehensive event creation with rich details
- **Event Management**: Edit, update, and manage created events
- **Attendee Tracking**: Monitor event registrations and attendees
- **Payment Integration**: Secure payment processing for paid events
- **Analytics**: Track event performance and engagement

### Additional Features
- **Responsive Design**: Mobile-first design approach
- **Dark/Light Theme**: Theme switching capability
- **Email Notifications**: Automated email system for updates
- **Cloud Storage**: Cloudinary integration for image management
- **QR Code Generation**: QR codes for event verification
- **Password Recovery**: Secure password reset functionality

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - Modern React with latest features
- **Vite** - Fast build tool and development server
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API requests
- **Bootstrap 5.3.7** - UI component framework
- **React Icons** - Icon library
- **React Toastify** - Toast notifications
- **React DatePicker** - Date selection component
- **React Paginate** - Pagination component

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Multer** - File upload handling
- **Cloudinary** - Cloud image and video management
- **PDFKit** - PDF generation for certificates
- **QRCode** - QR code generation
- **SSLCommerz** - Payment gateway integration

## 📁 Project Structure

```
CampusCrew/
├── backend/
│   ├── middleware/
│   │   └── bkashAuth.js          # Payment authentication
│   ├── models/
│   │   ├── EventModel.js         # Event data schema
│   │   ├── RegistrationModel.js  # Registration data schema
│   │   └── UserModel.js          # User data schema
│   ├── Router/
│   │   ├── EventRoute.js         # Event-related routes
│   │   ├── Recommendation.js     # Recommendation system routes
│   │   ├── RegistrationRoute.js  # Registration routes
│   │   └── UserRoute.js          # User authentication routes
│   ├── utils/
│   │   ├── certificateGenerator.js # Certificate generation utility
│   │   ├── cloudinary.js         # Cloud storage configuration
│   │   ├── multer.js            # File upload configuration
│   │   └── sendEmail.js         # Email service utility
│   ├── database.js              # MongoDB connection
│   ├── index.js                 # Server entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── Components/
    │   │   ├── Footer.jsx        # Application footer
    │   │   ├── Header.jsx        # Navigation header
    │   │   ├── HeroBanner.jsx    # Landing page banner
    │   │   └── loader_login.jsx  # Loading component
    │   ├── contexts/
    │   │   ├── AuthContext.jsx   # Authentication context
    │   │   └── ThemeContext.jsx  # Theme management context
    │   ├── Pages/
    │   │   ├── Home.jsx          # Landing page
    │   │   ├── Login.jsx         # Authentication page
    │   │   ├── Dashboard.jsx     # User dashboard
    │   │   ├── CreateEvent.jsx   # Event creation form
    │   │   ├── EventDetails.jsx  # Event information page
    │   │   ├── Profile.jsx       # User profile management
    │   │   └── ... (other pages)
    │   ├── CSS/                  # Styling files
    │   ├── assets/               # Static assets
    │   ├── data/                 # FAQ and static data
    │   └── utils/                # Utility functions
    ├── index.html
    └── package.json
```

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/AsifAvaas/CampusCrew.git
   cd CampusCrew/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   PORT=8000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   FRONTEND_URL=http://localhost:5173
   BKASH_USERNAME=your_bkash_username
   BKASH_PASSWORD=your_bkash_password
   BKASH_APP_KEY=your_bkash_app_key
   BKASH_APP_SECRET=your_bkash_app_secret
   ```

4. **Start the backend server**
   ```bash
   nodemon index.js
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

## 📖 Usage

### For Students

1. **Registration**: Create an account with your email
2. **Verification**: Verify your email address
3. **Browse Events**: Explore upcoming campus events
4. **Register**: Sign up for events that interest you
5. **Payment**: Complete payment for paid events via bKash
6. **Certificates**: Download certificates for completed events

### For Event Organizers

1. **Admin Registration**: Create an organizer account
2. **Event Creation**: Create detailed event listings
3. **Management**: Monitor registrations and manage events
4. **Analytics**: Track event performance

## 🔗 API Endpoints

### Authentication
- `POST /api/user/register` - User registration
- `POST /api/user/login` - User login
- `POST /api/user/verify-email` - Email verification
- `POST /api/user/forgot-password` - Password reset request
- `POST /api/user/reset-password` - Password reset confirmation

### Events
- `GET /api/event/` - Fetch all events
- `POST /api/event/create` - Create new event
- `GET /api/event/:id` - Get event details
- `PUT /api/event/:id` - Update event
- `DELETE /api/event/:id` - Delete event

### Registration
- `POST /api/registration/register` - Register for event
- `GET /api/registration/user/:userId` - Get user registrations
- `POST /api/registration/payment` - Process payment

### Recommendations
- `GET /api/recommendation/:userId` - Get personalized recommendations

## 🔧 Environment Variables

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | Yes |
| `EMAIL_USER` | Email service username | Yes |
| `EMAIL_PASS` | Email service password | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `FRONTEND_URL` | Frontend application URL | Yes |
| `BKASH_USERNAME` | bKash payment username | Optional |
| `BKASH_PASSWORD` | bKash payment password | Optional |
| `BKASH_APP_KEY` | bKash application key | Optional |
| `BKASH_APP_SECRET` | bKash application secret | Optional |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | Yes |


## 👥 Team

- **Asif Avaas** - asif13.aak@gmail.com
- **Sanjida Amin** - sanjidasunny25@gmail.com
- **Tajuddin Ahmed** - bijoy.ahmed12555@gmail.com



---

**CampusCrew** - Connecting Campus Communities Through Events 🎓✨
