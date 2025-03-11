import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWalkById, getWalkObservations } from '../services/firestoreService';
import { formatDistance, formatDuration } from '../utils/formatUtils';
import { formatDate, formatTime } from '../utils/dateUtils';
import MapComponent from '../components/MapComponent';
import ObservationCard from '../components/ObservationCard';
import ShareButton from '../components/ShareButton';
import { FaArrowLeft, FaCalendarAlt, FaClock, FaRuler, FaMapMarkerAlt, FaCamera } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { createShareableImage } from '../utils/shareUtils';

/**
 * Pagina voor het weergeven van een samenvatting van een afgesloten wandeling, inclusief alle observaties, foto's en een kaart.
 */
const WalkSummaryPage = () => {
  const { walkId } = useParams();
  const navigate = useNavigate();
  const [walk, setWalk] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  
  // Haal wandelgegevens op
  useEffect(() => {
    const fetchWalkData = async () => {
      try {
        setLoading(true);
        
        // Haal wandeling op
        const walkData = await getWalkById(walkId);
        if (!walkData) {
          throw new Error('Wandeling niet gevonden');
        }
        setWalk(walkData);
        
        // Haal observaties op
        const observationsData = await getWalkObservations(walkId);
        // Sorteer observaties op tijdstip
        const sortedObservations = observationsData.sort((a, b) => {
          return a.timestamp?.toDate() - b.timestamp?.toDate();
        });
        setObservations(sortedObservations);
        
        setLoading(false);
      } catch (err) {
        console.error('Fout bij het ophalen van wandelgegevens:', err);
        setError('Kon de wandelgegevens niet laden. Probeer het later opnieuw.');
        setLoading(false);
      }
    };
    
    fetchWalkData();
  }, [walkId]);
  
  // Bereken statistieken
  const getStatistics = () => {
    if (!walk) return {};
    
    const distance = walk.distance || 0;
    const duration = walk.endTime && walk.startTime 
      ? (walk.endTime.toDate() - walk.startTime.toDate()) / 1000 
      : 0;
    const photoCount = observations.reduce((count, obs) => {
      return count + (obs.mediaUrls?.length || 0);
    }, 0);
    
    return {
      distance,
      duration,
      observationCount: observations.length,
      photoCount
    };
  };
  
  const stats = getStatistics();
  
  // Deel de wandeling
  const handleShare = async () => {
    try {
      setShareLoading(true);
      
      // Genereer een deelbare afbeelding
      const shareableImage = await createShareableImage(walk, observations, stats);
      
      // Deel de afbeelding
      if (navigator.share && shareableImage) {
        try {
          await navigator.share({
            title: `Wandeling: ${walk.title || 'Mijn wandeling'}`,
            text: `Bekijk mijn wandeling van ${formatDistance(stats.distance)} op ${formatDate(walk.startTime?.toDate())}`,
            files: [shareableImage]
          });
          console.log('Wandeling succesvol gedeeld');
        } catch (shareError) {
          // Controleer of het een geannuleerde deelactie is
          if (shareError.name === 'AbortError') {
            console.log('Delen geannuleerd door gebruiker');
          } else {
            // Voor andere fouten, val terug op de URL-kopieer methode
            console.warn('Web Share API fout, terugvallen op URL kopiëren:', shareError);
            const shareUrl = `${window.location.origin}/share/${walkId}`;
            await navigator.clipboard.writeText(shareUrl);
            alert('Link gekopieerd naar klembord! Je kunt deze nu delen.');
          }
        }
      } else {
        // Fallback voor browsers zonder Web Share API
        const shareUrl = `${window.location.origin}/share/${walkId}`;
        
        // Kopieer de URL naar het klembord
        await navigator.clipboard.writeText(shareUrl);
        alert('Link gekopieerd naar klembord! Je kunt deze nu delen.');
      }
    } catch (err) {
      console.error('Fout bij het delen:', err);
      
      // Toon alleen een foutmelding als het geen geannuleerde deelactie is
      if (err.name !== 'AbortError') {
        alert('Kon de wandeling niet delen. Probeer het later opnieuw.');
      }
    } finally {
      setShareLoading(false);
    }
  };
  
  // Ga terug naar de vorige pagina
  const handleBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-16 h-16 border-t-4 border-green-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600">Wandelgegevens laden...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-6 bg-red-100 rounded-lg">
          <h2 className="mb-4 text-xl font-bold text-red-700">Fout</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 mt-4 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Terug
          </button>
        </div>
      </div>
    );
  }
  
  if (!walk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-6 bg-yellow-100 rounded-lg">
          <h2 className="mb-4 text-xl font-bold text-yellow-700">Wandeling niet gevonden</h2>
          <p className="text-yellow-600">De opgevraagde wandeling kon niet worden gevonden.</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 mt-4 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Terug
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header met wandelinformatie */}
      <div className="relative bg-green-700 text-white">
        <div className="container px-4 py-8 mx-auto">
          <button 
            onClick={handleBack}
            className="absolute top-4 left-4 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30"
            aria-label="Terug"
          >
            <FaArrowLeft />
          </button>
          
          <h1 className="mb-2 text-2xl font-bold text-center">
            {walk.title || 'Mijn wandeling'}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <div className="flex items-center">
              <FaCalendarAlt className="mr-2" />
              <span>{formatDate(walk.startTime?.toDate())}</span>
            </div>
            <div className="flex items-center">
              <FaClock className="mr-2" />
              <span>{formatDuration(stats.duration)}</span>
            </div>
            <div className="flex items-center">
              <FaRuler className="mr-2" />
              <span>{formatDistance(stats.distance)}</span>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="mr-2" />
              <span>{observations.length} observaties</span>
            </div>
            <div className="flex items-center">
              <FaCamera className="mr-2" />
              <span>{stats.photoCount} foto's</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Kaart sectie */}
      <div className="container px-4 py-6 mx-auto">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-xl font-bold text-gray-800">Route</h2>
          <div className="h-64 overflow-hidden rounded-lg sm:h-96">
            {(walk.path || walk.pathPoints) && (walk.path?.length > 0 || walk.pathPoints?.length > 0) ? (
              <MapComponent 
                pathPoints={walk.path || walk.pathPoints}
                observations={observations}
                center={(walk.path && walk.path[0]) || (walk.pathPoints && walk.pathPoints[0]) || (walk.startLocation && [walk.startLocation.lat, walk.startLocation.lng])}
                showObservations={true}
                interactive={true}
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <p className="text-gray-500">Geen routegegevens beschikbaar</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Observaties tijdlijn */}
      <div className="container px-4 py-6 mx-auto">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Observaties</h2>
            <ShareButton 
              onClick={handleShare} 
              loading={shareLoading}
              text="Deel deze wandeling"
            />
          </div>
          
          {observations.length === 0 ? (
            <p className="py-4 text-center text-gray-500">Geen observaties voor deze wandeling</p>
          ) : (
            <div className="space-y-6">
              {observations.map((observation, index) => (
                <motion.div
                  key={observation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-8 border-l-2 border-green-500"
                >
                  <div className="absolute top-0 left-0 w-4 h-4 -ml-2 bg-green-500 rounded-full"></div>
                  <div className="mb-1 text-sm text-gray-500">
                    {formatTime(observation.timestamp?.toDate())}
                  </div>
                  <ObservationCard 
                    observation={observation}
                    showActions={false}
                    className="w-full"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalkSummaryPage; 