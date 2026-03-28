import { Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import Home from "./Pages/Home.jsx";
import Login from "./Pages/Login.jsx";
import Profile from "./Pages/Profile.jsx";
import UpcomingEvent from "./Pages/UpcomingEvent.jsx";
import CreateEvent from "./Pages/CreateEvent.jsx";
import JoinedEvent from "./Pages/JoinedEvent.jsx";
import About from "./Pages/About.jsx";
import Contact from "./Pages/Contact.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import EventDetails from "./Pages/EventDetails.jsx";
import EditEvent from "./Pages/EditEvent.jsx";
import Success from "./Pages/Success.jsx";
import Failure from "./Pages/Failure.jsx";
import Forbidden from "./Pages/Forbidden.jsx";
import NotFound from "./Pages/NotFound.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import VerifyEmail from "./Pages/VerifyEmail.jsx";
import ForgotPassword from "./Pages/ForgotPassword.jsx";
import ResetPassword from "./Pages/ResetPassword.jsx";
import EventAttendee from "./Pages/EventAttendee.jsx";
import AdminSignup from "./Pages/AdminSignup.jsx";
import ChatbotButton from "./Components/Chatbot/ChatbotButton.jsx";

// Core application component managing navigation and access control
function App() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
    // Could use a dedicated loading spinner here
  }

  return (
    <>
      {/* Application routing configuration with security checks */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        {/* User authentication required for these routes */}
        <Route
          path="/profile"
          element={
            isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/upcoming-events"
          element={
            isAuthenticated ? (
              <UpcomingEvent />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Administrator privileges needed for these routes */}
        <Route
          path="/create-event"
          element={
            isAuthenticated && user?.isAdmin ? (
              <CreateEvent />
            ) : isAuthenticated ? (
              <Navigate to="/forbidden" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Alternative path redirect for common misspelling */}
        <Route
          path="/create-events"
          element={<Navigate to="/create-event" replace />}
        />
        <Route
          path="/joined-events"
          element={
            isAuthenticated ? <JoinedEvent /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/success" element={<Success />} />
        <Route path="/failure?" element={<Failure />} />

        <Route
          path="/events/:id"
          element={
            isAuthenticated ? (
              <EventDetails />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            isAuthenticated ? (
              user?.isAdmin ? (
                <EditEvent />
              ) : (
                <Navigate to="/forbidden" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/dashboard"
          element={user?.isAdmin ? <Dashboard /> : <Forbidden />}
        />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="/event-attendee/:id" element={<EventAttendee />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
      </Routes>
      
      {/* Interactive assistant accessible across all pages */}
      <ChatbotButton />
    </>
  );
}

export default App;
