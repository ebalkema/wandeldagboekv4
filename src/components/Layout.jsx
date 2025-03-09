import { Outlet } from 'react-router-dom';
import Header from './Header';
import TabNavigation from './TabNavigation';

/**
 * Component voor de algemene pagina-layout
 */
const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-4 sm:py-6 max-w-screen-xl pb-20">
        <div className="w-full max-w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
      
      <TabNavigation />
    </div>
  );
};

export default Layout; 