import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Component voor beveiligde routes
 * Redirects naar login als de gebruiker niet is ingelogd
 */
const PrivateRoute = () => {
  const { currentUser } = useAuth();

  // Als er geen gebruiker is ingelogd, redirect naar login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Anders, render de child routes
  return <Outlet />;
};

export default PrivateRoute; 