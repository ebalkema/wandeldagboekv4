import { createContext, useState, useContext, useCallback, useEffect } from 'react';

// Maak de VoiceContext
export const VoiceContext = createContext();

// VoiceProvider component
export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');

  // Controleer of spraakherkenning wordt ondersteund
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Start met luisteren naar spraak
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Spraakherkenning wordt niet ondersteund in deze browser.');
      return;
    }
    
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'nl-NL';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    
    recognitionInstance.onstart = () => {
      console.log('Spraakherkenning gestart');
      setIsListening(true);
      setTranscript('');
      setFinalTranscript('');
    };
    
    recognitionInstance.onresult = (event) => {
      const current = event.resultIndex;
      const currentTranscript = event.results[current][0].transcript;
      console.log('Spraakherkenning resultaat:', currentTranscript);
      
      // Update de transcript
      setTranscript(currentTranscript);
      
      // Als dit een definitief resultaat is, update ook de finalTranscript
      if (event.results[current].isFinal) {
        console.log('Definitief resultaat:', currentTranscript);
        setFinalTranscript(currentTranscript);
      }
    };
    
    recognitionInstance.onend = () => {
      console.log('Spraakherkenning gestopt');
      setIsListening(false);
      
      // Als er geen finalTranscript is, maar wel een transcript, gebruik dan de laatste transcript
      if (!finalTranscript && transcript) {
        console.log('Geen definitief resultaat, gebruik laatste transcript:', transcript);
        setFinalTranscript(transcript);
      }
    };
    
    recognitionInstance.onerror = (event) => {
      console.error('Spraakherkenningsfout:', event.error);
      setIsListening(false);
    };
    
    try {
      recognitionInstance.start();
      setRecognition(recognitionInstance);
    } catch (error) {
      console.error('Fout bij het starten van spraakherkenning:', error);
    }
  }, [transcript, finalTranscript]);

  // Stop met luisteren naar spraak
  const stopListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Fout bij het stoppen van spraakherkenning:', error);
      }
    }
  }, [recognition]);

  // Verwerk spraakcommando's
  const processCommand = useCallback((text) => {
    if (!text) return null;
    
    const lowerText = text.toLowerCase().trim();
    console.log('Verwerken van commando:', lowerText);
    
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
    finalTranscript,
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