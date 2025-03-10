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
  const [error, setError] = useState(null);

  // Controleer of spraakherkenning wordt ondersteund
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (!SpeechRecognition) {
      setError('Spraakherkenning wordt niet ondersteund in deze browser.');
      console.error('Spraakherkenning wordt niet ondersteund in deze browser.');
    }
  }, []);

  // Start met luisteren naar spraak
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Spraakherkenning wordt niet ondersteund in deze browser.');
      console.error('Spraakherkenning wordt niet ondersteund in deze browser.');
      return;
    }
    
    // Stop eventuele bestaande spraakherkenning
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Fout bij het stoppen van bestaande spraakherkenning:', error);
      }
    }
    
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'nl-NL';
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.maxAlternatives = 3;
    
    recognitionInstance.onstart = () => {
      console.log('Spraakherkenning gestart');
      setIsListening(true);
      setTranscript('');
      setFinalTranscript('');
      setError(null);
    };
    
    recognitionInstance.onresult = (event) => {
      let currentTranscript = '';
      
      // Verzamel alle resultaten
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const bestResult = result[0].transcript;
          console.log('Definitief resultaat:', bestResult);
          setFinalTranscript(prev => prev + ' ' + bestResult);
          currentTranscript += bestResult + ' ';
        } else {
          const interimResult = result[0].transcript;
          currentTranscript += interimResult + ' ';
        }
      }
      
      if (currentTranscript) {
        console.log('Spraakherkenning resultaat:', currentTranscript);
        setTranscript(currentTranscript.trim());
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
      setError(`Spraakherkenningsfout: ${event.error}`);
      setIsListening(false);
      
      // Probeer opnieuw te starten bij een no-speech fout
      if (event.error === 'no-speech') {
        console.log('Geen spraak gedetecteerd, probeer opnieuw te starten');
        setTimeout(() => {
          try {
            recognitionInstance.start();
          } catch (error) {
            console.error('Fout bij het opnieuw starten van spraakherkenning:', error);
          }
        }, 100);
      }
    };
    
    try {
      recognitionInstance.start();
      setRecognition(recognitionInstance);
    } catch (error) {
      console.error('Fout bij het starten van spraakherkenning:', error);
      setError(`Fout bij het starten van spraakherkenning: ${error.message}`);
    }
  }, [transcript, finalTranscript, recognition]);

  // Stop met luisteren naar spraak
  const stopListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.stop();
        console.log('Spraakherkenning handmatig gestopt');
      } catch (error) {
        console.error('Fout bij het stoppen van spraakherkenning:', error);
        setError(`Fout bij het stoppen van spraakherkenning: ${error.message}`);
      }
    }
  }, [recognition]);

  // Verwerk spraakcommando's
  const processCommand = useCallback((text) => {
    if (!text) return null;
    
    const lowerText = text.toLowerCase().trim();
    console.log('Verwerken van commando:', lowerText);
    
    // Commando's voor wandelingen
    if (lowerText.includes('start wandeling') || 
        lowerText.includes('begin wandeling') || 
        lowerText.includes('nieuwe wandeling')) {
      return { type: 'NEW_WALK' };
    } else if (lowerText.includes('stop wandeling') || 
              lowerText.includes('beëindig wandeling') || 
              lowerText.includes('einde wandeling')) {
      return { type: 'END_WALK' };
    } 
    // Commando's voor navigatie
    else if (lowerText.includes('ga naar wandelingen') || 
            lowerText.includes('toon wandelingen') || 
            lowerText.includes('bekijk wandelingen')) {
      return { type: 'VIEW_WALKS' };
    }
    else if (lowerText.includes('ga naar dashboard') || 
            lowerText.includes('toon dashboard') || 
            lowerText.includes('naar dashboard')) {
      return { type: 'GO_DASHBOARD' };
    }
    // Commando's voor observaties
    else if (lowerText.includes('nieuwe observatie') || 
            lowerText.includes('voeg observatie toe') || 
            lowerText.includes('maak observatie')) {
      return { type: 'NEW_OBSERVATION', text: text };
    }
    // Commando's voor stoppen
    else if (lowerText.includes('stop') || 
            lowerText.includes('stop met luisteren') || 
            lowerText.includes('stop opname')) {
      return { type: 'STOP_LISTENING' };
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
    error,
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