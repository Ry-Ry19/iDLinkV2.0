/**
 * LEARNER'S NOTE:
 * App.tsx is the root component that sets up the entire application structure.
 * It wraps the app with providers (QueryClient, TooltipProvider, Toaster) and
 * configures React Router with all page routes.
 *
 * KEY CONCEPTS:
 * - QueryClientProvider: Enables React Query for data fetching/caching
 * - BrowserRouter + Routes: Handles client-side routing
 * - Route paths: / = Landing, /login = Login, /student/dashboard = StudentDashboard, etc.
 * - Role-based routing: Students, Employees, and Staff each have their own dashboard routes
 *
 * ROUTE STRUCTURE:
 * Public routes: Landing, Login, Register, Apply, Revalidate, Track, Contract, Team
 * Student routes: /student/dashboard
 * Employee routes: /employee/dashboard
 * Staff routes: /staff/dashboard, /staff/pending, /staff/records, etc.
 * Catch-all: * renders NotFound page
 */
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ApplyForID from "./pages/ApplyForID";
import ContractExpiration from "./pages/ContractExpiration";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import RecordsManagement from "./pages/RecordsManagement";
import Register from "./pages/Register";
import RevalidateID from "./pages/RevalidateID";
import ReviewApplication from "./pages/ReviewApplication";
import StaffDashboard from "./pages/StaffDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Team from "./pages/Team";
import TrackStatus from "./pages/TrackStatus";
import Profile from "./pages/Profile";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/apply" element={<ApplyForID />} />
          <Route path="/revalidate" element={<RevalidateID />} />
          <Route path="/track" element={<TrackStatus />} />
          <Route path="/contract" element={<ContractExpiration />} />
          <Route path="/profile" element={<Profile />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          
          {/* Employee Routes */}
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          
          {/* Staff Routes */}
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/pending" element={<ReviewApplication />} />
          <Route path="/staff/approved" element={<StaffDashboard />} />
          <Route path="/staff/returned" element={<StaffDashboard />} />
          <Route path="/staff/records" element={<RecordsManagement />} />
          <Route path="/staff/logs" element={<StaffDashboard />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />

          {/* Team Members */}
          <Route path="/team" element={<Team />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
