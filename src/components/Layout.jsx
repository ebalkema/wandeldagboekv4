import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import TabNavigation from './TabNavigation';
import { FaHeart, FaExternalLinkAlt } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import PodcastPage from '../pages/PodcastPage';

// Website URL
const WEBSITE_URL = 'https://www.mennoenerwin.nl';

/**
 * Component voor de algemene pagina-layout
 */
const Layout = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Controleer schermgrootte en pas aan wanneer deze verandert
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Controleer of we op een actieve wandelingspagina zijn
  const isActivePage = currentPath.includes('/active-walk/');
  
  // Controleer of we op de podcast pagina zijn
  const isPodcastPage = currentPath === '/podcast';
  
  // Toon geen Header op de actieve wandelingspagina, omdat deze daar apart wordt toegevoegd
  // met specifieke props voor die pagina
  const shouldShowHeader = !isActivePage;
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header alleen tonen als we niet op een actieve wandelingspagina zijn */}
      {shouldShowHeader && <Header />}
      
      <main className={`flex-grow w-full px-0 sm:container sm:mx-auto sm:px-4 py-2 sm:py-6 sm:max-w-screen-xl ${isMobile ? 'pb-16' : 'pb-20'}`}>
        <div className="w-full max-w-full overflow-hidden">
          {isPodcastPage ? <PodcastPage /> : <Outlet />}
        </div>
      </main>
      
      <footer className="bg-primary-800 text-white py-2 sm:py-4 text-center text-sm mt-auto hidden sm:block">
        <div className="container mx-auto px-2 sm:px-4">
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
      
      {/* Mobiele footer - alleen zichtbaar op kleine schermen */}
      <footer className="bg-primary-800 text-white py-1 text-center text-xs mt-auto block sm:hidden">
        <div className="container mx-auto px-2">
          <p className="flex items-center justify-center">
            <a 
              href={`${WEBSITE_URL}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-primary-200 flex items-center"
            >
              Menno & Erwin
              <FaExternalLinkAlt className="ml-1 h-2 w-2" />
            </a>
          </p>
        </div>
      </footer>
      
      <TabNavigation />
    </div>
  );
};

export default Layout; 