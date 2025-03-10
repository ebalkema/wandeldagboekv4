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
  birdLocations = [],
  height = '100%',
  zoom = 15,
  showCurrentLocation = true,
  showTimestamps = false,
  offlineMode = false,
  onObservationClick,
  onBirdLocationClick
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pathLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const birdMarkersLayerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapError, setMapError] = useState(false);
  const [selectedBirdLocation, setSelectedBirdLocation] = useState(null);

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

  // Voeg vogelwaarnemingen toe aan de kaart
  useEffect(() => {
    if (mapInstanceRef.current && birdLocations && birdLocations.length > 0) {
      // Verwijder bestaande vogelmarkers
      if (birdMarkersLayerRef.current) {
        birdMarkersLayerRef.current.clearLayers();
      } else {
        birdMarkersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      }
      
      // Maak een aangepast icoon voor vogelwaarnemingen
      const birdIcon = L.divIcon({
        className: 'custom-bird-marker',
        html: `<div class="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                  <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.55a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
                </svg>
              </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const hotspotIcon = L.divIcon({
        className: 'custom-hotspot-marker',
        html: `<div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                </svg>
              </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      // Controleer of birdLocations een array is of een enkel object
      const locationsArray = Array.isArray(birdLocations) ? birdLocations : [birdLocations];
      
      // Voeg markers toe voor elke vogelwaarneming
      const markers = [];
      locationsArray.forEach(location => {
        if (location && location.lat && location.lng) {
          const icon = location.type === 'hotspot' ? hotspotIcon : birdIcon;
          const marker = L.marker([location.lat, location.lng], { icon }).addTo(birdMarkersLayerRef.current);
          
          // Voeg popup toe met informatie
          const popupContent = `
            <div class="bird-popup">
              <h3 class="font-bold">${location.dutchName || location.name}</h3>
              ${location.dutchName ? `<p class="text-sm text-gray-600">${location.name}</p>` : ''}
              <p class="text-xs mt-1">${location.type === 'hotspot' ? 'Hotspot' : 'Vogelwaarneming'}</p>
            </div>
          `;
          marker.bindPopup(popupContent);
          
          // Voeg click handler toe
          if (onBirdLocationClick) {
            marker.on('click', () => {
              onBirdLocationClick(location);
            });
          }
          
          markers.push(marker);
        }
      });
      
      // Als er meerdere markers zijn, zoom uit om ze allemaal te tonen
      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
      } 
      // Als er maar één marker is, zoom in op die locatie
      else if (markers.length === 1 && locationsArray.length === 1) {
        mapInstanceRef.current.setView([locationsArray[0].lat, locationsArray[0].lng], 15);
        markers[0].openPopup();
        setSelectedBirdLocation(locationsArray[0]);
      }
    }
  }, [birdLocations, onBirdLocationClick]);

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