import { Link } from 'react-router-dom';
import { formatSmartDate, formatDuration, getDurationInMinutes } from '../utils/dateUtils';
import { formatDistance } from '../services/locationService';
import WeatherDisplay from './WeatherDisplay';

/**
 * Component voor het weergeven van een wandelkaart
 */
const WalkCard = ({ walk }) => {
  if (!walk) return null;

  // Bereken de duur van de wandeling
  const duration = walk.endTime && walk.startTime
    ? getDurationInMinutes(
        new Date(walk.startTime.seconds * 1000),
        new Date(walk.endTime.seconds * 1000)
      )
    : null;

  // Bepaal of de wandeling actief is
  const isActive = !walk.endTime;

  return (
    <Link 
      to={isActive ? `/active-walk/${walk.id}` : `/walk/${walk.id}`}
      className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{walk.name}</h3>
            <p className="text-sm text-gray-600">
              {walk.startTime && formatSmartDate(new Date(walk.startTime.seconds * 1000))}
            </p>
          </div>
          
          {walk.weather && (
            <WeatherDisplay weather={walk.weather} size="small" />
          )}
        </div>
        
        <div className="mt-3 flex items-center text-sm">
          <div className="flex items-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{duration ? formatDuration(duration) : 'Actief'}</span>
          </div>
          
          <div className="flex items-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>{walk.distance ? formatDistance(walk.distance) : '0 m'}</span>
          </div>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>{walk.observationCount || 0} observaties</span>
          </div>
        </div>
        
        {isActive && (
          <div className="mt-3 flex justify-end">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 mr-1 bg-green-500 rounded-full animate-pulse"></span>
              Actief
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default WalkCard; 