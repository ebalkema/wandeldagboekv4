import { createContext, useState, useContext, useCallback, useEffect } from 'react';

// Maak de VoiceContext
export const VoiceContext = createContext();

// VoiceProvider component
export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  // Controleer of spraakherkenning wordt ondersteund
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Start met luisteren naar spraak
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Spraakherkenning wordt niet ondersteund in deze browser.');
      return;
    }
    
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'nl-NL';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    
    recognitionInstance.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };
    
    recognitionInstance.onresult = (event) => {
      const current = event.resultIndex;
      const currentTranscript = event.results[current][0].transcript;
      setTranscript(currentTranscript);
    };
    
    recognitionInstance.onend = () => {
      setIsListening(false);
    };
    
    recognitionInstance.onerror = (event) => {
      console.error('Spraakherkenningsfout:', event.error);
      setIsListening(false);
    };
    
    recognitionInstance.start();
    setRecognition(recognitionInstance);
  }, []);

  // Stop met luisteren naar spraak
  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
  }, [recognition]);

  // Verwerk spraakcommando's
  const processCommand = useCallback((text) => {
    if (!text) return null;
    
    const lowerText = text.toLowerCase().trim();
    
    // Commando's voor wandelingen
    if (lowerText.includes('start wandeling') || lowerText.includes('begin wandeling')) {
      return { type: 'START_WALK' };
    } else if (lowerText.includes('stop wandeling') || 
              lowerText.includes('beëindig wandeling') || 
              lowerText.includes('einde wandeling')) {
      return { type: 'END_WALK' };
    } 
    // Commando's voor observaties
    else if (lowerText.includes('nieuwe observatie') || 
            lowerText.includes('voeg observatie toe') || 
            lowerText.includes('maak observatie')) {
      return { type: 'NEW_OBSERVATION' };
    }
    // Geen commando herkend
    else {
      return { type: 'TEXT', text: text };
    }
  }, []);

  // Context waarde
  const value = {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    processCommand
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

// Hook om de VoiceContext te gebruiken
export const useVoice = () => useContext(VoiceContext);

export default VoiceProvider; 