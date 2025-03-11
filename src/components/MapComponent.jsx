import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatTime } from '../utils/dateUtils';
import { getCurrentLocation } from '../services/locationService';

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
  onBirdLocationClick,
  className = ''
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
  const [userLocation, setUserLocation] = useState(null);
  const [processedPathPoints, setProcessedPathPoints] = useState([]);

  // Verwerk de pathPoints naar een consistent formaat
  useEffect(() => {
    if (!pathPoints || pathPoints.length === 0) {
      setProcessedPathPoints([]);
      return;
    }

    try {
      // Converteer pathPoints naar het juiste formaat voor de kaart
      let points = [];
      
      // Controleer of pathPoints een array is
      if (Array.isArray(pathPoints)) {
        // Sorteer op index als beschikbaar
        const sortedPoints = [...pathPoints].sort((a, b) => {
          if (a.index !== undefined && b.index !== undefined) {
            return a.index - b.index;
          }
          return 0;
        });
        
        // Converteer naar [lat, lng] formaat voor de kaart
        points = sortedPoints.map(point => {
          if (Array.isArray(point)) {
            return point; // Al in het juiste formaat
          } else if (point.lat !== undefined && point.lng !== undefined) {
            return [point.lat, point.lng];
          }
          return null;
        }).filter(point => point !== null);
      } else if (typeof pathPoints === 'object') {
        // Het kan een object zijn met geneste punten
        const keys = Object.keys(pathPoints);
        // Sorteer de keys numeriek als mogelijk
        const sortedKeys = keys.sort((a, b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return 0;
        });
        
        points = sortedKeys.map(key => {
          const point = pathPoints[key];
          if (Array.isArray(point)) {
            return point;
          } else if (point && point.lat !== undefined && point.lng !== undefined) {
            return [point.lat, point.lng];
          }
          return null;
        }).filter(point => point !== null);
      }
      
      console.log(`Wandelpad punten verwerkt: ${points.length}`);
      if (points.length > 0) {
        console.log('Eerste punt:', points[0], 'Laatste punt:', points[points.length - 1]);
      }
      
      setProcessedPathPoints(points);
    } catch (error) {
      console.error('Fout bij het verwerken van pathPoints:', error);
      setProcessedPathPoints([]);
    }
  }, [pathPoints]);

  // Haal de huidige locatie op als er geen center is opgegeven
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        if (!location.isDefault) {
          setUserLocation([location.lat, location.lng]);
          console.log('Huidige locatie opgehaald voor kaart:', location);
        } else {
          console.log('Fallback locatie gebruikt voor kaart');
        }
      } catch (error) {
        console.error('Fout bij het ophalen van locatie voor kaart:', error);
      }
    };
    
    if (!center && !userLocation) {
      fetchUserLocation();
    }
  }, [center, userLocation]);

  // Initialiseer de kaart
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    try {
      // Bepaal het centrum van de kaart
      const locationToUse = center || userLocation || [52.3676, 4.9041]; // Amsterdam als fallback
      
      // Initialiseer de kaart
      mapInstanceRef.current = L.map(mapRef.current, {
        center: locationToUse,
        zoom: zoom,
        zoomControl: true,
        attributionControl: true
      });
      
      // Voeg de tileLayer toe (kaartachtergrond)
      if (!offlineMode) {
        tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
      } else {
        // Offline modus - toon een grijze achtergrond
        mapInstanceRef.current.getContainer().style.backgroundColor = '#f0f0f0';
      }
      
      // Maak layers voor pad en markers
      pathLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      birdMarkersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      
      // Voeg huidige locatie marker toe als showCurrentLocation is ingeschakeld
      if (showCurrentLocation) {
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
        
        currentLocationMarkerRef.current = L.marker(locationToUse, {
          icon: currentLocationIcon,
          zIndexOffset: 1000
        }).addTo(mapInstanceRef.current);
      }
    } catch (error) {
      console.error('Fout bij het initialiseren van de kaart:', error);
      setMapError(true);
    }
    
    // Cleanup functie
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, userLocation, zoom, offlineMode, showCurrentLocation]);

  // Update de kaartweergave als de huidige locatie verandert
  useEffect(() => {
    if (mapInstanceRef.current) {
      const locationToUse = center || userLocation;
      
      if (locationToUse) {
        // Update de kaartweergave
        mapInstanceRef.current.setView(locationToUse, mapInstanceRef.current.getZoom());
        
        // Update of maak de huidige locatie marker
        if (showCurrentLocation) {
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setLatLng(locationToUse);
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
            
            currentLocationMarkerRef.current = L.marker(locationToUse, {
              icon: currentLocationIcon,
              zIndexOffset: 1000
            }).addTo(mapInstanceRef.current);
          }
        }
      }
    }
  }, [center, userLocation, showCurrentLocation]);

  // Update het pad op de kaart als processedPathPoints verandert
  useEffect(() => {
    if (processedPathPoints && processedPathPoints.length > 0 && pathLayerRef.current) {
      pathLayerRef.current.clearLayers();
      
      console.log('Aantal routepunten:', processedPathPoints.length);
      
      // Als er maar één punt is, teken een cirkel om dat punt
      if (processedPathPoints.length === 1) {
        console.log('Slechts één routepunt beschikbaar, teken een cirkel');
        const point = processedPathPoints[0];
        
        // Teken een cirkel rond het punt
        L.circle(point, {
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          radius: 100 // 100 meter radius
        }).addTo(pathLayerRef.current);
        
        // Voeg een marker toe voor het punt
        L.marker(point, { 
          icon: createCustomIcon('green', 'start')
        }).addTo(pathLayerRef.current)
        .bindPopup('Start/Eind');
        
        // Centreer de kaart op dit punt
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(point, 15);
        }
        
        return;
      }
      
      // Teken het pad als er meerdere punten zijn
      const polyline = L.polyline(processedPathPoints, { 
        color: '#4285F4', 
        weight: 4,
        opacity: 0.7
      }).addTo(pathLayerRef.current);
      
      // Voeg start en eindmarker toe
      if (processedPathPoints.length >= 2) {
        // Start marker (groen)
        L.marker(processedPathPoints[0], { 
          icon: createCustomIcon('green', 'start')
        }).addTo(pathLayerRef.current)
        .bindPopup('Start');
        
        // Eind marker (rood)
        L.marker(processedPathPoints[processedPathPoints.length - 1], { 
          icon: createCustomIcon('red', 'end')
        }).addTo(pathLayerRef.current)
        .bindPopup('Huidige positie');
        
        // Voeg tijdsindicaties toe als showTimestamps is ingeschakeld
        if (showTimestamps && processedPathPoints.length > 10) {
          // Voeg tijdsindicaties toe op regelmatige intervallen (elke 10% van de route)
          const interval = Math.max(1, Math.floor(processedPathPoints.length / 10));
          
          for (let i = interval; i < processedPathPoints.length - interval; i += interval) {
            if (i % interval === 0) {
              const point = processedPathPoints[i];
              const timestamp = getTimestampForPoint(i, processedPathPoints.length);
              
              L.marker(point, {
                icon: createCustomIcon('#6B7280', 'timestamp', '8px')
              }).addTo(pathLayerRef.current)
              .bindPopup(`Tijd: ${timestamp}`);
            }
          }
        }
      }
      
      // Pas de kaartweergave aan om het hele pad te tonen
      if (mapInstanceRef.current && processedPathPoints.length > 1) {
        mapInstanceRef.current.fitBounds(polyline.getBounds(), {
          padding: [50, 50]
        });
      }
    }
  }, [processedPathPoints, showTimestamps]);

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
    if (mapInstanceRef.current && birdLocations && (Array.isArray(birdLocations) ? birdLocations.length > 0 : birdLocations)) {
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
          let popupContent = '';
          
          if (location.type === 'hotspot') {
            popupContent = `
              <div class="bird-popup">
                <h3 class="font-bold">${location.name}</h3>
                <p class="text-xs mt-1">Hotspot met ${location.numSpeciesAllTime || 'meerdere'} soorten</p>
              </div>
            `;
          } else {
            // Formateer de datum
            const observationDate = location.observationDate ? 
              new Date(location.observationDate).toLocaleDateString('nl-NL') : '';
            
            popupContent = `
              <div class="bird-popup">
                <h3 class="font-bold">${location.dutchName || location.name}</h3>
                ${location.dutchName && location.commonName ? `<p class="text-sm text-gray-600">${location.commonName}</p>` : ''}
                ${location.scientificName ? `<p class="text-xs italic text-gray-500">${location.scientificName}</p>` : ''}
                <div class="mt-2 text-xs">
                  ${location.howMany ? `<p>${location.howMany} exempla${location.howMany === 1 ? 'ar' : 'ren'}</p>` : ''}
                  ${observationDate ? `<p>Waargenomen op: ${observationDate}</p>` : ''}
                </div>
              </div>
            `;
          }
          
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
        mapInstanceRef.current.fitBounds(group.getBounds(), { 
          padding: [50, 50],
          maxZoom: 14 // Beperk het inzoomen om een beter overzicht te houden
        });
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
    <div style={{ height }} className={className}>
      {mapError ? (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
          <p>Kon de kaart niet laden</p>
        </div>
      ) : (
        <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      )}
    </div>
  );
};

export default MapComponent; 