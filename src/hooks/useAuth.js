import { useAuth as useAuthFromContext } from '../context/AuthContext';

/**
 * Hook om de AuthContext te gebruiken
 * @returns {Object} - AuthContext
 */
export const useAuth = () => {
  return useAuthFromContext();
};

export default useAuth; 