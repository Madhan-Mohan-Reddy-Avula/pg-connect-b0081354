import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerAnalytics from "./pages/owner/OwnerAnalytics";
import PGSetup from "./pages/owner/PGSetup";
import RoomsManagement from "./pages/owner/RoomsManagement";
import GuestsManagement from "./pages/owner/GuestsManagement";
import RentTracking from "./pages/owner/RentTracking";
import UPISettings from "./pages/owner/UPISettings";
import PaymentVerification from "./pages/owner/PaymentVerification";
import OwnerComplaints from "./pages/owner/OwnerComplaints";
import ExpensesManagement from "./pages/owner/ExpensesManagement";
import GuestDashboard from "./pages/guest/GuestDashboard";
import GuestProfile from "./pages/guest/GuestProfile";
import PayRent from "./pages/guest/PayRent";
import GuestComplaints from "./pages/guest/GuestComplaints";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'owner' | 'guest' }) {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (role !== allowedRole) {
    return <Navigate to={role === 'owner' ? '/owner' : '/guest'} replace />;
  }
  
  return <>{children}</>;
}

function AuthRedirect() {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={role === 'owner' ? '/owner' : '/guest'} replace />;
  }
  
  return <Auth />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/auth" element={<AuthRedirect />} />
      
      {/* Owner Routes */}
      <Route path="/owner" element={<ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>} />
      <Route path="/owner/analytics" element={<ProtectedRoute allowedRole="owner"><OwnerAnalytics /></ProtectedRoute>} />
      <Route path="/owner/pg" element={<ProtectedRoute allowedRole="owner"><PGSetup /></ProtectedRoute>} />
      <Route path="/owner/rooms" element={<ProtectedRoute allowedRole="owner"><RoomsManagement /></ProtectedRoute>} />
      <Route path="/owner/guests" element={<ProtectedRoute allowedRole="owner"><GuestsManagement /></ProtectedRoute>} />
      <Route path="/owner/rents" element={<ProtectedRoute allowedRole="owner"><RentTracking /></ProtectedRoute>} />
      <Route path="/owner/upi" element={<ProtectedRoute allowedRole="owner"><UPISettings /></ProtectedRoute>} />
      <Route path="/owner/payments" element={<ProtectedRoute allowedRole="owner"><PaymentVerification /></ProtectedRoute>} />
      <Route path="/owner/complaints" element={<ProtectedRoute allowedRole="owner"><OwnerComplaints /></ProtectedRoute>} />
      <Route path="/owner/expenses" element={<ProtectedRoute allowedRole="owner"><ExpensesManagement /></ProtectedRoute>} />
      
      {/* Guest Routes */}
      <Route path="/guest" element={<ProtectedRoute allowedRole="guest"><GuestDashboard /></ProtectedRoute>} />
      <Route path="/guest/profile" element={<ProtectedRoute allowedRole="guest"><GuestProfile /></ProtectedRoute>} />
      <Route path="/guest/pay" element={<ProtectedRoute allowedRole="guest"><PayRent /></ProtectedRoute>} />
      <Route path="/guest/complaints" element={<ProtectedRoute allowedRole="guest"><GuestComplaints /></ProtectedRoute>} />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
