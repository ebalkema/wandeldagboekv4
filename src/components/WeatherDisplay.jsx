import { getWeatherIconUrl } from '../services/weatherService';

/**
 * Component voor het weergeven van weergegevens
 */
const WeatherDisplay = ({ weather, size = 'medium' }) => {
  if (!weather) {
    return null;
  }

  // Bepaal de grootte van het component
  const sizeClasses = {
    small: {
      container: 'flex items-center text-xs',
      icon: 'w-6 h-6 object-contain',
      temp: 'text-sm font-semibold',
      desc: 'hidden'
    },
    medium: {
      container: 'flex items-center',
      icon: 'w-8 h-8 object-contain',
      temp: 'text-base font-semibold',
      desc: 'text-xs text-gray-600'
    },
    large: {
      container: 'flex flex-col items-center',
      icon: 'w-12 h-12 object-contain',
      temp: 'text-xl font-bold',
      desc: 'text-sm text-gray-600'
    }
  };

  const classes = sizeClasses[size] || sizeClasses.medium;

  return (
    <div className={classes.container}>
      {weather.icon && (
        <div className="flex-shrink-0">
          <img 
            src={getWeatherIconUrl(weather.icon)} 
            alt={weather.description || 'Weer'} 
            className={classes.icon}
            loading="lazy"
          />
        </div>
      )}
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