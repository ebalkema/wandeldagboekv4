import { useState, useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';

/**
 * Component voor een spraakherkenningsknop
 */
const VoiceButton = ({ 
  onResult, 
  size = 'medium', 
  color = 'primary',
  label = 'Spreek',
  listeningLabel = 'Luisteren...',
  autoStop = true,
  autoStopTime = 5000,
  className = '',
  disabled = false
}) => {
  const { isListening, transcript, startListening, stopListening, isSupported } = useVoice();
  const [localTranscript, setLocalTranscript] = useState('');

  // Update de lokale transcript wanneer de globale transcript verandert
  useEffect(() => {
    if (isListening) {
      setLocalTranscript(transcript);
    }
  }, [transcript, isListening]);

  // Stop automatisch met luisteren na een bepaalde tijd
  useEffect(() => {
    let timer;
    
    if (isListening && autoStop) {
      timer = setTimeout(() => {
        stopListening();
        if (onResult && localTranscript) {
          onResult(localTranscript);
        }
      }, autoStopTime);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isListening, autoStop, autoStopTime, stopListening, onResult, localTranscript]);

  // Wanneer het luisteren stopt, geef het resultaat door
  useEffect(() => {
    if (!isListening && localTranscript && onResult) {
      onResult(localTranscript);
      setLocalTranscript('');
    }
  }, [isListening, localTranscript, onResult]);

  // Bepaal de grootte van de knop
  const sizeClasses = {
    small: 'w-10 h-10 text-sm',
    medium: 'w-14 h-14 text-base',
    large: 'w-20 h-20 text-lg'
  };

  // Bepaal de kleur van de knop
  const colorClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  // Combineer de klassen
  const buttonClasses = `
    ${sizeClasses[size] || sizeClasses.medium}
    ${colorClasses[color] || colorClasses.primary}
    rounded-full flex items-center justify-center shadow-lg
    transition-all duration-200 ease-in-out
    ${isListening ? 'animate-pulse' : ''}
    ${disabled || !isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  // Klik handler
  const handleClick = () => {
    if (disabled || !isSupported) return;
    
    if (isListening) {
      stopListening();
    } else {
      setLocalTranscript('');
      startListening();
    }
  };

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || !isSupported}
      aria-label={isListening ? listeningLabel : label}
    >
      {isListening ? (
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-xs mt-1">{listeningLabel}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-xs mt-1">{label}</span>
        </div>
      )}
    </button>
  );
};

export default VoiceButton; 