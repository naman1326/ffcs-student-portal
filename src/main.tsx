import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e1916",
              color: "#f5e6d3",
              border: "1px solid rgba(255, 107, 53, 0.3)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 107, 53, 0.15)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.88rem",
            },
            success: {
              iconTheme: {
                primary: "#1fae5f",
                secondary: "#1e1916",
              },
            },
            error: {
              iconTheme: {
                primary: "#e2493a",
                secondary: "#1e1916",
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
