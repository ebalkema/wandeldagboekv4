import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatTime } from '../utils/dateUtils';

/**
 * Component voor het weergeven van een kaart met wandelroute en observaties
 */
const MapComponent = ({ 
  center, 
  pathPoints = [], 
  observations = [],
  height = '100%',
  zoom = 15,
  showCurrentLocation = true,
  showTimestamps = false,
  offlineMode = false
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pathLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  // Initialiseer de kaart
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Standaard locatie (Amsterdam) als er geen huidige locatie is
      const defaultLocation = [52.3676, 4.9041];
      const initialLocation = center || (pathPoints.length > 0 ? pathPoints[0] : defaultLocation);
      
      // Initialiseer de kaart
      mapInstanceRef.current = L.map(mapRef.current).setView(initialLocation, zoom);
      
      // Voeg OpenStreetMap tiles toe
      try {
        tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          // Voeg caching toe voor offline gebruik
          useCache: true,
          crossOrigin: true
        }).addTo(mapInstanceRef.current);
        
        // Voeg een error handler toe voor offline modus
        tileLayerRef.current.on('tileerror', (error) => {
          console.log('Tile error:', error);
          setMapError(true);
        });
      } catch (error) {
        console.error('Fout bij het laden van kaart tiles:', error);
        setMapError(true);
      }
      
      // Maak lagen voor het pad en markers
      pathLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }
    
    // Cleanup functie
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update de kaartweergave als de huidige locatie verandert
  useEffect(() => {
    if (center && mapInstanceRef.current) {
      // Update de kaartweergave
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
      
      // Update of maak de huidige locatie marker
      if (showCurrentLocation) {
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setLatLng(center);
        } else {
          // Maak een aangepaste marker voor de huidige locatie
          const currentLocationIcon = L.divIcon({
            className: 'current-location-marker',
            html: `
              <div style="
                background-color: #4285F4;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 0 2px #4285F4;
              "></div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          
          currentLocationMarkerRef.current = L.marker(center, { 
            icon: currentLocationIcon,
            zIndexOffset: 1000
          }).addTo(mapInstanceRef.current);
        }
      }
    }
  }, [center, showCurrentLocation]);

  // Update het pad op de kaart als pathPoints verandert
  useEffect(() => {
    if (pathPoints && pathPoints.length > 1 && pathLayerRef.current) {
      pathLayerRef.current.clearLayers();
      
      // Teken het pad
      const polyline = L.polyline(pathPoints, { 
        color: '#4285F4', 
        weight: 4,
        opacity: 0.7
      }).addTo(pathLayerRef.current);
      
      // Voeg start en eindmarker toe
      if (pathPoints.length >= 2) {
        // Start marker (groen)
        L.marker(pathPoints[0], { 
          icon: createCustomIcon('green', 'start')
        }).addTo(pathLayerRef.current)
        .bindPopup('Start');
        
        // Eind marker (rood)
        L.marker(pathPoints[pathPoints.length - 1], { 
          icon: createCustomIcon('red', 'end')
        }).addTo(pathLayerRef.current)
        .bindPopup('Huidige positie');
        
        // Voeg tijdsindicaties toe als showTimestamps is ingeschakeld
        if (showTimestamps && pathPoints.length > 10) {
          // Voeg tijdsindicaties toe op regelmatige intervallen (elke 10% van de route)
          const interval = Math.max(1, Math.floor(pathPoints.length / 10));
          
          for (let i = interval; i < pathPoints.length - interval; i += interval) {
            if (i % interval === 0) {
              const point = pathPoints[i];
              const timestamp = getTimestampForPoint(i, pathPoints.length);
              
              L.marker(point, {
                icon: createCustomIcon('#6B7280', 'timestamp', '8px')
              }).addTo(pathLayerRef.current)
              .bindPopup(`Tijd: ${timestamp}`);
            }
          }
        }
      }
      
      // Pas de kaartweergave aan om het hele pad te tonen
      if (mapInstanceRef.current && pathPoints.length > 1) {
        mapInstanceRef.current.fitBounds(polyline.getBounds(), {
          padding: [50, 50]
        });
      }
    }
  }, [pathPoints, showTimestamps]);

  // Voeg observatiemarkers toe
  useEffect(() => {
    if (observations && observations.length > 0 && markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      
      // Sorteer observaties op timestamp
      const sortedObservations = [...observations].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeA - timeB;
      });
      
      sortedObservations.forEach((obs, index) => {
        if (obs.location) {
          const location = Array.isArray(obs.location) 
            ? obs.location 
            : [obs.location.lat, obs.location.lng];
          
          // Voeg een nummer toe aan de marker om de volgorde aan te geven
          const marker = L.marker(location, {
            icon: createCustomIcon(getObservationColor(obs.category), 'observation', undefined, index + 1)
          }).addTo(markersLayerRef.current);
          
          // Maak een popup met de observatie-informatie
          const popupContent = `
            <div class="observation-popup">
              <h3>${obs.category || 'Observatie'} #${index + 1}</h3>
              <p>${obs.text}</p>
              ${getTimestampDisplay(obs.timestamp)}
              ${obs.pendingSync ? '<div style="color: #3B82F6; margin-top: 4px; font-size: 0.75rem;">Wacht op synchronisatie</div>' : ''}
            </div>
          `;
          
          marker.bindPopup(popupContent);
        }
      });
    }
  }, [observations]);

  // Functie om een geschatte timestamp te genereren voor een punt op de route
  const getTimestampForPoint = (index, totalPoints) => {
    // Dit is een schatting, in werkelijkheid zou je de echte timestamps moeten gebruiken
    const percentage = index / totalPoints;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    // Bereken een geschatte tijd tussen start en nu
    const estimatedTime = new Date(oneHourAgo.getTime() + (percentage * (now.getTime() - oneHourAgo.getTime())));
    
    return formatTime(estimatedTime);
  };

  // Functie om timestamp weer te geven
  const getTimestampDisplay = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      // Voor Firestore timestamp
      if (timestamp.seconds) {
        return `<small>${new Date(timestamp.seconds * 1000).toLocaleTimeString()}</small>`;
      }
      
      // Voor ISO string (offline modus)
      if (typeof timestamp === 'string') {
        return `<small>${new Date(timestamp).toLocaleTimeString()}</small>`;
      }
    } catch (error) {
      console.error('Fout bij het formatteren van timestamp:', error);
    }
    
    return '';
  };

  // Functie om de kleur van een observatie te bepalen
  const getObservationColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'vogel':
      case 'vogels':
        return '#3B82F6'; // blue
      case 'plant':
      case 'planten':
        return '#10B981'; // green
      case 'dier':
      case 'dieren':
        return '#F59E0B'; // yellow
      default:
        return '#6B7280'; // gray
    }
  };

  // Functie om aangepaste markers te maken
  const createCustomIcon = (color, type, size = '10px', number) => {
    let html = '';
    const iconSize = size === '8px' ? [12, 12] : [16, 16];
    
    switch (type) {
      case 'start':
        html = `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`;
        break;
      case 'end':
        html = `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`;
        break;
      case 'timestamp':
        html = `<div style="background-color: ${color}; width: ${size}; height: ${size}; border-radius: 50%; border: 1px solid white;"></div>`;
        break;
      case 'observation':
        if (number !== undefined) {
          html = `
            <div style="position: relative;">
              <div style="
                background-color: ${color};
                width: ${size};
                height: ${size};
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 0 1px ${color};
              "></div>
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                background-color: white;
                color: #333;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid ${color};
                font-weight: bold;
              ">${number}</div>
            </div>
          `;
        } else {
          html = `
            <div style="
              background-color: ${color};
              width: ${size};
              height: ${size};
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 0 1px ${color};
            "></div>
          `;
        }
        break;
      default:
        html = `<div style="background-color: ${color}; width: ${size}; height: ${size}; border-radius: 50%; border: 2px solid white;"></div>`;
    }
    
    return L.divIcon({
      className: `custom-marker-${type}`,
      html,
      iconSize,
      iconAnchor: [iconSize[0]/2, iconSize[1]/2]
    });
  };

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }} 
      />
      
      {/* Offline waarschuwing als er een kaartfout is */}
      {(offlineMode || mapError) && (
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#B45309',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg style={{ width: '16px', height: '16px', marginRight: '8px' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Kaartgegevens beperkt beschikbaar in offline modus
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent; 