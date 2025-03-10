import { Outlet } from 'react-router-dom';
import Header from './Header';
import TabNavigation from './TabNavigation';
import { FaHeart, FaExternalLinkAlt } from 'react-icons/fa';

// Website URL
const WEBSITE_URL = 'https://www.mennoenerwin.nl';

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
              href={`${WEBSITE_URL}/over-ons`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 underline hover:text-primary-200 flex items-center"
            >
              Menno & Erwin
              <FaExternalLinkAlt className="ml-1 h-3 w-3" />
            </a>
          </p>
          <p className="mt-1 text-primary-200 text-xs">
            Bezoek{' '}
            <a 
              href={`${WEBSITE_URL}/afleveringen`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-white flex items-center inline-flex"
            >
              www.mennoenerwin.nl
              <FaExternalLinkAlt className="ml-1 h-2 w-2" />
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