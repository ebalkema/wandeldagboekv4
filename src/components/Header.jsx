import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Component voor de navigatiebalk
 */
const Header = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Uitloggen
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Fout bij uitloggen:', error);
    }
  };

  // Menu openen/sluiten
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo en titel */}
          <Link to="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xl font-bold">Wandeldagboek</span>
          </Link>

          {/* Navigatie voor desktop */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/" className="hover:text-blue-200 transition-colors duration-200">
              Dashboard
            </Link>
            <Link to="/walks" className="hover:text-blue-200 transition-colors duration-200">
              Wandelingen
            </Link>
            <Link to="/settings" className="hover:text-blue-200 transition-colors duration-200">
              Instellingen
            </Link>
            
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="ml-4 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-md transition-colors duration-200"
              >
                Uitloggen
              </button>
            ) : (
              <Link
                to="/login"
                className="ml-4 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-md transition-colors duration-200"
              >
                Inloggen
              </Link>
            )}
          </nav>

          {/* Hamburger menu voor mobiel */}
          <button
            className="md:hidden text-white focus:outline-none"
            onClick={toggleMenu}
            aria-label="Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobiel menu */}
        {isMenuOpen && (
          <nav className="md:hidden mt-3 pb-3">
            <Link
              to="/"
              className="block py-2 hover:bg-blue-700 rounded px-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/walks"
              className="block py-2 hover:bg-blue-700 rounded px-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Wandelingen
            </Link>
            <Link
              to="/settings"
              className="block py-2 hover:bg-blue-700 rounded px-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Instellingen
            </Link>
            
            {currentUser ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left py-2 hover:bg-blue-700 rounded px-2"
              >
                Uitloggen
              </button>
            ) : (
              <Link
                to="/login"
                className="block py-2 hover:bg-blue-700 rounded px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Inloggen
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header; 