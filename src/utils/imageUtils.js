/**
 * Utility functies voor het werken met afbeeldingen
 */

/**
 * Detecteert of de gebruiker op een iOS-apparaat zit
 * @returns {boolean} - Of de gebruiker op een iOS-apparaat zit
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Comprimeert een afbeelding naar een specifieke maximale grootte
 * @param {File} file - Het originele afbeeldingsbestand
 * @param {Object} options - Compressie-opties
 * @param {number} options.maxWidth - Maximale breedte in pixels (standaard 1200)
 * @param {number} options.maxHeight - Maximale hoogte in pixels (standaard 1200)
 * @param {number} options.quality - JPEG-kwaliteit tussen 0 en 1 (standaard 0.7)
 * @returns {Promise<Blob>} - Een gecomprimeerde afbeelding als Blob
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.7
  } = options;
  
  return new Promise((resolve, reject) => {
    // Controleer of het bestand een afbeelding is
    if (!file || !file.type || !file.type.startsWith('image/')) {
      console.warn('Bestand is geen afbeelding, compressie wordt overgeslagen');
      resolve(file);
      return;
    }
    
    // Log bestandsinformatie voor debugging
    console.log('Compressie - origineel bestand:', {
      naam: file.name,
      type: file.type,
      grootte: `${(file.size / 1024).toFixed(2)} KB`
    });
    
    // Detecteer iOS
    const isIOSDevice = isIOS();
    console.log('Compressie - is iOS apparaat:', isIOSDevice);
    
    // Speciale behandeling voor iOS-apparaten
    let targetQuality = quality;
    let targetMaxWidth = maxWidth;
    let targetMaxHeight = maxHeight;
    
    if (isIOSDevice) {
      console.log('iOS apparaat gedetecteerd, extra compressie toepassen');
      // Verlaag kwaliteit en afmetingen voor iOS
      targetQuality = 0.5;
      targetMaxWidth = 1000;
      targetMaxHeight = 1000;
      
      // Extra verlaging voor grote bestanden
      if (file.size > 5 * 1024 * 1024) {
        console.warn('Grote afbeelding op iOS, kwaliteit wordt verder verlaagd');
        targetQuality = 0.4;
        targetMaxWidth = 800;
        targetMaxHeight = 800;
      }
    }
    
    // Maak een FileReader om het bestand te lezen
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      // Maak een afbeeldingselement om de afmetingen te bepalen
      const img = new Image();
      
      img.onload = () => {
        try {
          // Bereken de nieuwe afmetingen met behoud van de aspect ratio
          let width = img.width;
          let height = img.height;
          
          console.log('Compressie - originele afmetingen:', { width, height });
          
          if (width > targetMaxWidth) {
            height = Math.round(height * (targetMaxWidth / width));
            width = targetMaxWidth;
          }
          
          if (height > targetMaxHeight) {
            width = Math.round(width * (targetMaxHeight / height));
            height = targetMaxHeight;
          }
          
          console.log('Compressie - nieuwe afmetingen:', { width, height });
          
          // Maak een canvas om de afbeelding te tekenen
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Teken de afbeelding op het canvas
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF'; // Witte achtergrond
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converteer het canvas naar een blob
          // Gebruik altijd JPEG voor consistentie
          canvas.toBlob((blob) => {
            if (!blob) {
              console.error('Kon afbeelding niet comprimeren');
              resolve(file); // Gebruik het originele bestand als fallback
              return;
            }
            
            // Maak een nieuw File object met dezelfde naam maar met .jpg extensie
            const fileNameBase = file.name.replace(/\.[^/.]+$/, ""); // Verwijder extensie
            const compressedFile = new File([blob], `${fileNameBase}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log(`Afbeelding gecomprimeerd: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB (${Math.round((compressedFile.size / file.size) * 100)}%)`);
            
            // Extra controle voor iOS: als het bestand nog steeds te groot is, probeer nog meer te comprimeren
            if (isIOSDevice && compressedFile.size > 2 * 1024 * 1024) {
              console.warn('Bestand is nog steeds te groot na compressie, probeer nogmaals met lagere kwaliteit');
              
              // Probeer nogmaals met nog lagere kwaliteit
              canvas.toBlob((secondBlob) => {
                if (!secondBlob) {
                  resolve(compressedFile); // Gebruik het eerste gecomprimeerde bestand
                  return;
                }
                
                const extraCompressedFile = new File([secondBlob], `${fileNameBase}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                
                console.log(`Extra compressie: ${(compressedFile.size / 1024).toFixed(2)}KB -> ${(extraCompressedFile.size / 1024).toFixed(2)}KB (${Math.round((extraCompressedFile.size / compressedFile.size) * 100)}%)`);
                resolve(extraCompressedFile);
              }, 'image/jpeg', 0.3); // Zeer lage kwaliteit voor tweede poging
            } else {
              resolve(compressedFile);
            }
          }, 'image/jpeg', targetQuality);
        } catch (error) {
          console.error('Fout bij het comprimeren van afbeelding:', error);
          resolve(file); // Gebruik het originele bestand als fallback
        }
      };
      
      img.onerror = (error) => {
        console.error('Fout bij het laden van afbeelding voor compressie:', error);
        resolve(file); // Gebruik het originele bestand als fallback
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = (error) => {
      console.error('Fout bij het lezen van afbeelding voor compressie:', error);
      resolve(file); // Gebruik het originele bestand als fallback
    };
  });
};

/**
 * Maakt een thumbnail van een afbeelding
 * @param {File} file - Het originele afbeeldingsbestand
 * @param {number} size - De maximale grootte van de thumbnail (standaard 200px)
 * @returns {Promise<string>} - Een data URL voor de thumbnail
 */
export const createThumbnail = (file, size = 200) => {
  return new Promise((resolve, reject) => {
    // Controleer of het bestand een afbeelding is
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Bestand is geen afbeelding'));
      return;
    }
    
    // Detecteer iOS
    const isIOSDevice = isIOS();
    
    // Maak een FileReader om het bestand te lezen
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      // Maak een afbeeldingselement om de afmetingen te bepalen
      const img = new Image();
      
      img.onload = () => {
        try {
          // Bereken de nieuwe afmetingen met behoud van de aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > size) {
              height = Math.round(height * (size / width));
              width = size;
            }
          } else {
            if (height > size) {
              width = Math.round(width * (size / height));
              height = size;
            }
          }
          
          // Maak een canvas om de afbeelding te tekenen
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Teken de afbeelding op het canvas
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF'; // Witte achtergrond
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converteer het canvas naar een data URL
          // Gebruik lagere kwaliteit voor iOS-apparaten
          const dataUrl = canvas.toDataURL('image/jpeg', isIOSDevice ? 0.5 : 0.7);
          resolve(dataUrl);
        } catch (error) {
          console.error('Fout bij het maken van thumbnail:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('Fout bij het laden van afbeelding voor thumbnail:', error);
        reject(error);
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = (error) => {
      console.error('Fout bij het lezen van afbeelding voor thumbnail:', error);
      reject(error);
    };
  });
}; 