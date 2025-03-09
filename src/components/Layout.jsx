import { Outlet } from 'react-router-dom';
import Header from './Header';
import TabNavigation from './TabNavigation';
import { FaHeart } from 'react-icons/fa';

/**
 * Component voor de algemene pagina-layout
 */
const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-4 sm:py-6 max-w-screen-xl pb-20">
        <div className="w-full max-w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
      
      <footer className="bg-primary-800 text-white py-4 text-center text-sm mt-auto hidden sm:block">
        <div className="container mx-auto px-4">
          <p className="flex items-center justify-center">
            Gemaakt met <FaHeart className="text-red-500 mx-1" /> door{' '}
            <a 
              href="https://www.mennoenerwin.nl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 underline hover:text-primary-200"
            >
              Menno & Erwin
            </a>
          </p>
          <p className="mt-1 text-primary-200 text-xs">
            Bezoek{' '}
            <a 
              href="https://www.mennoenerwin.nl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              www.mennoenerwin.nl
            </a>
            {' '}voor onze natuurpodcast
          </p>
        </div>
      </footer>
      
      <TabNavigation />
    </div>
  );
};

export default Layout; 