import { formatTime } from '../utils/dateUtils';
import WeatherDisplay from './WeatherDisplay';

/**
 * Component voor het weergeven van een observatie
 */
const ObservationItem = ({ observation, onClick }) => {
  if (!observation) return null;

  // Bepaal de categorie-icoon
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'vogel':
      case 'vogels':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'plant':
      case 'planten':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'dier':
      case 'dieren':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
    }
  };

  // Bepaal de categoriekleur
  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'vogel':
      case 'vogels':
        return 'bg-blue-100 text-blue-800';
      case 'plant':
      case 'planten':
        return 'bg-green-100 text-green-800';
      case 'dier':
      case 'dieren':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onClick && onClick(observation)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <div className={`p-2 rounded-full mr-3 ${getCategoryColor(observation.category)}`}>
            {getCategoryIcon(observation.category)}
          </div>
          
          <div>
            <div className="flex items-center">
              <h3 className="font-medium text-gray-900">
                {observation.category || 'Observatie'}
              </h3>
              {observation.timestamp && (
                <span className="ml-2 text-xs text-gray-500">
                  {formatTime(new Date(observation.timestamp.seconds * 1000))}
                </span>
              )}
            </div>
            
            <p className="text-gray-700 mt-1">{observation.text}</p>
            
            {observation.mediaUrls && observation.mediaUrls.length > 0 && (
              <div className="mt-2 flex space-x-2 overflow-x-auto">
                {observation.mediaUrls.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`Foto ${index + 1}`} 
                    className="h-16 w-16 object-cover rounded-md"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {observation.weatherAtPoint && (
          <WeatherDisplay weather={observation.weatherAtPoint} size="small" />
        )}
      </div>
    </div>
  );
};

export default ObservationItem; 