import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
<<<<<<< HEAD
import "./CSS/themes.css"; // stylesheet containing global theme color and styling definitions
import "./CSS/theme-utils.css"; // stylesheet providing reusable CSS utility classes for common UI patterns
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>
  </BrowserRouter>
);
