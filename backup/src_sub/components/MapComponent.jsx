import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Component voor het weergeven van een kaart met wandelroute en observaties
 */
const MapComponent = ({ 
  currentLocation, 
  pathPoints = [], 
  observations = [],
  height = '100%',
  zoom = 15,
  showCurrentLocation = true
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pathLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);

  // Initialiseer de kaart
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Standaard locatie (Amsterdam) als er geen huidige locatie is
      const defaultLocation = [52.3676, 4.9041];
      const initialLocation = currentLocation || defaultLocation;
      
      // Initialiseer de kaart
      mapInstanceRef.current = L.map(mapRef.current).setView(initialLocation, zoom);
      
      // Voeg OpenStreetMap tiles toe
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
      
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
    if (currentLocation && mapInstanceRef.current) {
      // Update de kaartweergave
      mapInstanceRef.current.setView(currentLocation, mapInstanceRef.current.getZoom());
      
      // Update of maak de huidige locatie marker
      if (showCurrentLocation) {
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setLatLng(currentLocation);
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
          
          currentLocationMarkerRef.current = L.marker(currentLocation, { 
            icon: currentLocationIcon,
            zIndexOffset: 1000
          }).addTo(mapInstanceRef.current);
        }
      }
    }
  }, [currentLocation, showCurrentLocation]);

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
      }
      
      // Pas de kaartweergave aan om het hele pad te tonen
      if (mapInstanceRef.current && pathPoints.length > 1) {
        mapInstanceRef.current.fitBounds(polyline.getBounds(), {
          padding: [50, 50]
        });
      }
    }
  }, [pathPoints]);

  // Voeg observatiemarkers toe
  useEffect(() => {
    if (observations && observations.length > 0 && markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      
      observations.forEach(obs => {
        if (obs.location) {
          const location = Array.isArray(obs.location) 
            ? obs.location 
            : [obs.location.lat, obs.location.lng];
          
          const marker = L.marker(location, {
            icon: createCustomIcon('orange', 'observation')
          }).addTo(markersLayerRef.current);
          
          // Maak een popup met de observatie-informatie
          const popupContent = `
            <div class="observation-popup">
              <h3>${obs.category || 'Observatie'}</h3>
              <p>${obs.text}</p>
              ${obs.timestamp ? `<small>${new Date(obs.timestamp.seconds * 1000).toLocaleTimeString()}</small>` : ''}
            </div>
          `;
          
          marker.bindPopup(popupContent);
        }
      });
    }
  }, [observations]);

  // Functie om aangepaste markers te maken
  const createCustomIcon = (color, type) => {
    let html = '';
    
    switch (type) {
      case 'start':
        html = `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`;
        break;
      case 'end':
        html = `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`;
        break;
      case 'observation':
        html = `
          <div style="
            background-color: ${color};
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 1px ${color};
          "></div>
        `;
        break;
      default:
        html = `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>`;
    }
    
    return L.divIcon({
      className: `custom-marker-${type}`,
      html,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height, 
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }} 
    />
  );
};

export default MapComponent; 