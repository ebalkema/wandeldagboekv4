import { Link } from 'react-router-dom';
import { formatSmartDate, formatDuration, getDurationInMinutes } from '../utils/dateUtils';
import { formatDistance } from '../services/locationService';
import WeatherDisplay from './WeatherDisplay';
import { FaSync } from 'react-icons/fa';

/**
 * Component voor het weergeven van een wandelkaart
 */
const WalkCard = ({ walk }) => {
  if (!walk) return null;

  // Bereken de duur van de wandeling
  const duration = walk.endTime && walk.startTime
    ? getDurationInMinutes(
        getDateFromTimestamp(walk.startTime),
        getDateFromTimestamp(walk.endTime)
      )
    : null;

  // Bepaal of de wandeling actief is
  const isActive = !walk.endTime;
  
  // Bepaal of de wandeling nog gesynchroniseerd moet worden
  const isPendingSync = walk.pendingSync;

  // Helper functie om een datum te krijgen van verschillende timestamp formaten
  function getDateFromTimestamp(timestamp) {
    if (!timestamp) return new Date();
    
    // Voor Firestore timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Voor ISO string (offline modus)
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    return new Date();
  }

  return (
    <Link 
      to={isActive ? `/active-walk/${walk.id}` : `/walk/${walk.id}`}
      className={`block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 ${
        isPendingSync ? 'border-l-4 border-primary-400' : ''
      }`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div className="mr-2">
            <div className="flex items-center">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 line-clamp-1">{walk.name}</h3>
              {isPendingSync && (
                <div className="ml-2 text-primary-500 flex items-center text-xs">
                  <FaSync className="mr-1" />
                  <span>Niet gesynchroniseerd</span>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              {walk.startTime && formatSmartDate(getDateFromTimestamp(walk.startTime))}
            </p>
          </div>
          
          {walk.weather && (
            <div className="flex-shrink-0">
              <WeatherDisplay weather={walk.weather} size="small" />
            </div>
          )}
        </div>
        
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center text-xs sm:text-sm gap-y-1">
          <div className="flex items-center mr-3 sm:mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-primary-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{duration ? formatDuration(duration) : 'Actief'}</span>
          </div>
          
          <div className="flex items-center mr-3 sm:mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-primary-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>{walk.distance ? formatDistance(walk.distance) : '0 m'}</span>
          </div>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-primary-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>{walk.observationCount || 0} observaties</span>
          </div>
        </div>
        
        {isActive && (
          <div className="mt-2 sm:mt-3 flex justify-end">
            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 mr-1 bg-secondary-500 rounded-full animate-pulse"></span>
              Actief
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default WalkCard; 