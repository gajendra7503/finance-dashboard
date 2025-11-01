import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { FinanceProvider } from "./context/FinanceContext";
import { Toaster } from "react-hot-toast";
import "./styles/globals.css";
import { FilterProvider } from "./context/FilterContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
    <FilterProvider>
      <AuthProvider>
        <FinanceProvider>
          <App />
           <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
        </FinanceProvider>
      </AuthProvider>
      </FilterProvider>
    </BrowserRouter>
  </React.StrictMode>
);
