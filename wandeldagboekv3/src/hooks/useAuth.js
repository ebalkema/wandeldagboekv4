import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook voor het gebruik van de AuthContext
 * @returns {Object} - AuthContext waarde
 */
export const useAuth = () => {
  return useContext(AuthContext);
}; 