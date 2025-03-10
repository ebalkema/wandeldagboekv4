/**
 * Utility functies voor het werken met afbeeldingen
 */

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
    if (!file.type.startsWith('image/')) {
      console.warn('Bestand is geen afbeelding, compressie wordt overgeslagen');
      resolve(file);
      return;
    }
    
    // Maak een FileReader om het bestand te lezen
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      // Maak een afbeeldingselement om de afmetingen te bepalen
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Bereken de nieuwe afmetingen met behoud van de aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
        
        // Maak een canvas om de afbeelding te tekenen
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Teken de afbeelding op het canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converteer het canvas naar een blob
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('Kon afbeelding niet comprimeren');
            resolve(file); // Gebruik het originele bestand als fallback
            return;
          }
          
          // Maak een nieuw File object met dezelfde naam
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log(`Afbeelding gecomprimeerd: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => {
        console.error('Fout bij het laden van afbeelding voor compressie');
        resolve(file); // Gebruik het originele bestand als fallback
      };
    };
    
    reader.onerror = () => {
      console.error('Fout bij het lezen van afbeelding voor compressie');
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
    if (!file.type.startsWith('image/')) {
      reject(new Error('Bestand is geen afbeelding'));
      return;
    }
    
    // Maak een FileReader om het bestand te lezen
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      // Maak een afbeeldingselement om de afmetingen te bepalen
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
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
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converteer het canvas naar een data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Fout bij het laden van afbeelding voor thumbnail'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Fout bij het lezen van afbeelding voor thumbnail'));
    };
  });
}; 