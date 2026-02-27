import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import CitizenPage from './pages/CitizenPage';
import ERSDashboard from './pages/ERSDashboard';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import TrafficDashboard from './pages/TrafficDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: Home & Login */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />

        {/* Citizen — no login required */}
        <Route element={<DashboardLayout title="Emergency SOS" />}>
          <Route path="/citizen" element={<CitizenPage />} />
        </Route>

        {/* ERS */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ers']}>
              <DashboardLayout title="ERS Command Center" />
            </ProtectedRoute>
          }
        >
          <Route path="/ers" element={<ERSDashboard />} />
        </Route>

        {/* Ambulance */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ambulance']}>
              <DashboardLayout title="Ambulance Dashboard" />
            </ProtectedRoute>
          }
        >
          <Route path="/ambulance" element={<AmbulanceDashboard />} />
        </Route>

        {/* Hospital */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['hospital']}>
              <DashboardLayout title="Hospital Management" />
            </ProtectedRoute>
          }
        >
          <Route path="/hospital" element={<HospitalDashboard />} />
        </Route>

        {/* Traffic */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['traffic']}>
              <DashboardLayout title="Traffic Control" />
            </ProtectedRoute>
          }
        >
          <Route path="/traffic" element={<TrafficDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  );
}

export default App;
