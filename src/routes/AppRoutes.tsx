import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Goals from "../pages/Goals/Goals";
import Transactions from "../pages/Transactions/Transactions";
import Profile from "../pages/Profile/Profile";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/Signup";
import ProtectedRoute from "./ProtectedRoute";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BudgetPage from "../pages/Budget/BudgetPage";

const queryClient = new QueryClient();

export default function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>

    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="goals" element={<Goals />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Fallback */}
       <Route path="*" element={<Login/>} />
    </Routes>
  
  </QueryClientProvider>

  );
}
