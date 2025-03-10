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
      icon: 'w-6 h-6',
      temp: 'text-sm font-semibold',
      desc: 'hidden'
    },
    medium: {
      container: 'flex items-center',
      icon: 'w-10 h-10',
      temp: 'text-lg font-semibold',
      desc: 'text-xs text-gray-600'
    },
    large: {
      container: 'flex flex-col items-center',
      icon: 'w-16 h-16',
      temp: 'text-2xl font-bold',
      desc: 'text-sm text-gray-600'
    }
  };

  const classes = sizeClasses[size] || sizeClasses.medium;

  return (
    <div className={classes.container}>
      {weather.icon && (
        <img 
          src={getWeatherIconUrl(weather.icon)} 
          alt={weather.description || 'Weer'} 
          className={classes.icon}
        />
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