import React from "react";
import FaceRecognition from "./components/FaceRecognition.tsx";
import { Routes, Route, Navigate } from "react-router-dom";
import GeolocationAttendanceSystem from "./components/UI.tsx";
import { SignedOut, SignIn, SignUp, useUser } from "@clerk/clerk-react";
import AdminDashboard from "../src/components/AdminDashboard.tsx";

// Helper component to protect routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    // Optional: Add a loading indicator while Clerk checks auth state
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    // Redirect to login if not signed in
    return <Navigate to="/login" replace />;
  }

  // Render the protected component if signed in
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes for sign-in and sign-up */}
      <Route
        path="/login"
        element={
          <SignedOut>
            <div className="flex justify-center items-center min-h-screen">
              <SignIn routing="path" path="/login" />
            </div>
          </SignedOut>
        }
      />
      <Route
        path="/sign-up"
        element={
          <SignedOut>
            <div className="flex justify-center items-center min-h-screen">
              <SignUp routing="path" path="/sign-up" />
            </div>
          </SignedOut>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/face-api"
        element={
          <ProtectedRoute>
            <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
              <h1>Face Recognition App</h1>
              <FaceRecognition />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <GeolocationAttendanceSystem />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<AdminDashboard />} />
      {/* Optional: Handle cases where a signed-in user lands on /login */}
      {/* <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/sign-up" element={<Navigate to="/" replace />} /> */}
    </Routes>
  );
};

export default App;
