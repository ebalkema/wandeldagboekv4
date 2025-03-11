import { useState, useEffect } from 'react';
import { formatTime } from '../utils/dateUtils';
import { suggestObservationToJournal, checkJournalApiSupport } from '../services/journalService';
import WeatherDisplay from './WeatherDisplay';
import { FaCloudUploadAlt } from 'react-icons/fa';

/**
 * Component voor het weergeven van een observatie
 */
const ObservationItem = ({ observation, onClick, isOffline }) => {
  const [isJournalSupported] = useState(checkJournalApiSupport());
  const [sharingToJournal, setSharingToJournal] = useState(false);

  if (!observation) return null;

  // Log de observatie voor debugging
  console.log('Rendering ObservationItem:', observation);

  // Controleer of er mediaUrls zijn en log deze voor debugging
  useEffect(() => {
    if (observation.mediaUrls && observation.mediaUrls.length > 0) {
      console.log(`Observatie ${observation.id} heeft ${observation.mediaUrls.length} mediaUrls:`, observation.mediaUrls);
    }
  }, [observation]);

  // Deel observatie met Apple Journal
  const handleShareToJournal = async (e) => {
    e.stopPropagation(); // Voorkom dat de onClick van de parent wordt aangeroepen
    
    try {
      setSharingToJournal(true);
      const success = await suggestObservationToJournal(observation);
      
      if (success) {
        alert('Observatie succesvol gedeeld met Apple Journal');
      } else {
        alert('Kon observatie niet delen met Apple Journal');
      }
    } catch (error) {
      console.error('Fout bij het delen met Apple Journal:', error);
      alert('Er is een fout opgetreden bij het delen met Apple Journal');
    } finally {
      setSharingToJournal(false);
    }
  };

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

  // Bepaal de timestamp weergave
  const getTimestamp = () => {
    if (!observation.timestamp) return null;
    
    // Voor Firestore timestamp
    if (observation.timestamp.seconds) {
      return formatTime(new Date(observation.timestamp.seconds * 1000));
    }
    
    // Voor ISO string (offline modus)
    if (typeof observation.timestamp === 'string') {
      return formatTime(new Date(observation.timestamp));
    }
    
    return null;
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow duration-200 cursor-pointer ${isOffline ? 'border-l-4 border-blue-400' : ''}`}
      onClick={() => onClick && onClick(observation)}
      id={`observation-${observation.id}`}
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
              {getTimestamp() && (
                <span className="ml-2 text-xs text-gray-500">
                  {getTimestamp()}
                </span>
              )}
              
              {isOffline && (
                <span className="ml-2 flex items-center text-xs text-blue-600">
                  <FaCloudUploadAlt className="mr-1" />
                  Wacht op synchronisatie
                </span>
              )}
            </div>
            
            <p className="text-gray-700 mt-1">{observation.text}</p>
            
            {observation.mediaUrls && observation.mediaUrls.length > 0 ? (
              <div className="mt-2 flex space-x-2 overflow-x-auto">
                {observation.mediaUrls.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`Foto ${index + 1}`} 
                    className="h-16 w-16 object-cover rounded-md"
                    onError={(e) => {
                      console.error(`Fout bij het laden van afbeelding ${index} voor observatie ${observation.id}:`, url);
                      e.target.src = 'https://via.placeholder.com/150?text=Fout';
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Voorkom dat de onClick van de parent wordt aangeroepen
                      window.open(url, '_blank');
                    }}
                  />
                ))}
              </div>
            ) : observation.mediaUrls ? (
              <div className="mt-2 text-sm text-gray-500">
                Geen afbeeldingen beschikbaar (mediaUrls is leeg)
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          {observation.weatherAtPoint && (
            <WeatherDisplay weather={observation.weatherAtPoint} size="small" />
          )}
          
          {isJournalSupported && !isOffline && (
            <button
              className="mt-2 text-gray-500 hover:text-gray-700 p-1 rounded-full"
              onClick={handleShareToJournal}
              disabled={sharingToJournal}
              title="Deel met Apple Journal"
            >
              {sharingToJournal ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObservationItem; 