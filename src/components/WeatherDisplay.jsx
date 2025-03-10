import { useState, useEffect } from 'react';
import { getWeatherIconUrl } from '../services/weatherService';

/**
 * Component voor het weergeven van weergegevens
 */
const WeatherDisplay = ({ weather, size = 'medium' }) => {
  const [imageError, setImageError] = useState(false);
  
  // Reset de imageError state wanneer het weer verandert
  useEffect(() => {
    setImageError(false);
  }, [weather?.icon]);
  
  if (!weather) {
    return null;
  }

  // Bepaal de grootte van het component
  const sizeClasses = {
    small: {
      container: 'flex items-center text-xs',
      icon: 'w-6 h-6 object-contain',
      emoji: 'text-lg',
      temp: 'text-sm font-semibold',
      desc: 'hidden'
    },
    medium: {
      container: 'flex items-center',
      icon: 'w-8 h-8 object-contain',
      emoji: 'text-2xl',
      temp: 'text-base font-semibold',
      desc: 'text-xs text-gray-600'
    },
    large: {
      container: 'flex flex-col items-center',
      icon: 'w-12 h-12 object-contain',
      emoji: 'text-3xl',
      temp: 'text-xl font-bold',
      desc: 'text-sm text-gray-600'
    }
  };

  const classes = sizeClasses[size] || sizeClasses.medium;
  const iconUrl = !imageError && weather.icon ? getWeatherIconUrl(weather.icon) : null;

  return (
    <div className={classes.container}>
      <div className="flex-shrink-0">
        {iconUrl ? (
          <img 
            src={iconUrl} 
            alt={weather.description || 'Weer'} 
            className={classes.icon}
            loading="lazy"
            crossOrigin="anonymous"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={classes.emoji}>
            {weather.emoji || '🌡️'}
          </span>
        )}
      </div>
      <div className="flex flex-col ml-1">
        <span className={classes.temp}>{weather.temperature}°C</span>
        {weather.description && (
          <span className={classes.desc}>{weather.description}</span>
        )}
      </div>
    </div>
  );
};

export default WeatherDisplay; 