import { Outlet } from 'react-router-dom';
import Header from './Header';

/**
 * Component voor de algemene pagina-layout
 */
const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <Outlet />
      </main>
      
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Wandeldagboek - Een PWA voor natuurobservaties</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 