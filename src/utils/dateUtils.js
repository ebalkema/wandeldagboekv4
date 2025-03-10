import { format, formatDistance, formatRelative, isToday, isYesterday } from 'date-fns';
import { nl } from 'date-fns/locale';

/**
 * Utility functies voor het werken met datums
 */

/**
 * Formatteert een datum naar een leesbare string
 * @param {Date|number|string} date - Datum om te formatteren
 * @param {string} formatString - Format string (date-fns)
 * @returns {string} - Geformatteerde datum
 */
export const formatDate = (date, formatString = 'dd MMMM yyyy') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return format(dateObj, formatString, { locale: nl });
};

/**
 * Formatteert een tijd naar een leesbare string
 * @param {Date|number|string|Object} date - Datum om te formatteren
 * @returns {string} - Geformatteerde tijd
 */
export const formatTime = (date) => {
  if (!date) return '';
  
  try {
    let dateObj;
    
    // Controleer of het een Firestore timestamp is
    if (date && typeof date === 'object' && date.seconds !== undefined && date.nanoseconds !== undefined) {
      // Firestore timestamp
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      // JavaScript Date object
      dateObj = date;
    } else if (typeof date === 'number') {
      // Unix timestamp in milliseconden
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      // ISO string of andere datumstring
      dateObj = new Date(date);
    } else {
      // Onbekend formaat
      console.warn('Onbekend datumformaat:', date);
      return '--:--';
    }
    
    // Controleer of de datum geldig is
    if (isNaN(dateObj.getTime())) {
      console.warn('Ongeldige datum:', date);
      return '--:--';
    }
    
    return format(dateObj, 'HH:mm', { locale: nl });
  } catch (error) {
    console.error('Fout bij het formatteren van tijd:', error, date);
    return '--:--';
  }
};

/**
 * Formatteert een datum en tijd naar een leesbare string
 * @param {Date|number|string} date - Datum om te formatteren
 * @returns {string} - Geformatteerde datum en tijd
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return format(dateObj, 'dd MMM yyyy HH:mm', { locale: nl });
};

/**
 * Formatteert een datum relatief aan nu (bijv. "2 uur geleden")
 * @param {Date|number|string} date - Datum om te formatteren
 * @returns {string} - Relatieve datum
 */
export const formatRelativeDate = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return formatDistance(dateObj, new Date(), { 
    addSuffix: true,
    locale: nl
  });
};

/**
 * Formatteert een datum op een slimme manier (vandaag, gisteren, of datum)
 * @param {Date|number|string} date - Datum om te formatteren
 * @returns {string} - Slimme datum
 */
export const formatSmartDate = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  
  if (isToday(dateObj)) {
    return `Vandaag, ${formatTime(dateObj)}`;
  } else if (isYesterday(dateObj)) {
    return `Gisteren, ${formatTime(dateObj)}`;
  } else {
    return formatDateTime(dateObj);
  }
};

/**
 * Berekent de duur tussen twee datums in minuten
 * @param {Date|number|string} startDate - Startdatum
 * @param {Date|number|string} endDate - Einddatum
 * @returns {number} - Duur in minuten
 */
export const getDurationInMinutes = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = typeof startDate === 'object' ? startDate : new Date(startDate);
  const end = typeof endDate === 'object' ? endDate : new Date(endDate);
  
  return Math.round((end - start) / (1000 * 60));
};

/**
 * Formatteert een duur in minuten naar een leesbare string
 * @param {number} minutes - Duur in minuten
 * @returns {string} - Geformatteerde duur
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0 minuten';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} ${remainingMinutes === 1 ? 'minuut' : 'minuten'}`;
  } else if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'uur' : 'uur'}`;
  } else {
    return `${hours} ${hours === 1 ? 'uur' : 'uur'} en ${remainingMinutes} ${remainingMinutes === 1 ? 'minuut' : 'minuten'}`;
  }
}; 