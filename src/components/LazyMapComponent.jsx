import { lazy, Suspense } from 'react';

// Lazy load de MapComponent
const MapComponent = lazy(() => import('./MapComponent'));

// Laadcomponent voor tijdens het laden van de kaart
const MapLoadingFallback = ({ height }) => (
  <div 
    className="flex items-center justify-center bg-gray-100 rounded-lg" 
    style={{ height: height || '400px' }}
  >
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-2 text-primary-600 font-medium">Kaart laden...</p>
    </div>
  </div>
);

/**
 * Lazy-loaded MapComponent wrapper
 */
const LazyMapComponent = (props) => {
  return (
    <Suspense fallback={<MapLoadingFallback height={props.height} />}>
      <MapComponent {...props} />
    </Suspense>
  );
};

export default LazyMapComponent; 