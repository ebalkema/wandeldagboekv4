import { useState, useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';
import { FaMicrophone, FaStop } from 'react-icons/fa';

/**
 * Component voor een spraakherkenningsknop
 */
const VoiceButton = ({ 
  onResult, 
  size = 'medium', 
  color = 'primary',
  label = 'Spreek',
  listeningLabel = 'Luisteren...',
  stopLabel = 'Stop',
  autoStop = true,
  autoStopTime = 8000,
  className = '',
  disabled = false
}) => {
  const { isListening, transcript, startListening, stopListening, isSupported } = useVoice();
  const [localTranscript, setLocalTranscript] = useState('');
  const [shouldTriggerResult, setShouldTriggerResult] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Update de lokale transcript wanneer de globale transcript verandert
  useEffect(() => {
    if (isListening && transcript) {
      setLocalTranscript(transcript);
      console.log("Transcript bijgewerkt:", transcript);
      setIsRecording(true);
    }
  }, [transcript, isListening]);

  // Stop automatisch met luisteren na een bepaalde tijd
  useEffect(() => {
    let timer;
    
    if (isListening && autoStop) {
      timer = setTimeout(() => {
        console.log("AutoStop: Stoppen met luisteren na timeout");
        setShouldTriggerResult(true);
        stopListening();
        setIsRecording(false);
      }, autoStopTime);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isListening, autoStop, autoStopTime, stopListening]);

  // Wanneer het luisteren stopt, geef het resultaat door
  useEffect(() => {
    if ((!isListening && localTranscript) || shouldTriggerResult) {
      if (localTranscript && onResult) {
        console.log("Resultaat doorgeven:", localTranscript);
        onResult(localTranscript);
      }
      
      // Reset de state
      if (shouldTriggerResult) {
        setShouldTriggerResult(false);
      }
      
      if (!isListening) {
        setLocalTranscript('');
        setIsRecording(false);
      }
    }
  }, [isListening, localTranscript, onResult, shouldTriggerResult]);

  // Bepaal de grootte van de knop
  const sizeClasses = {
    xsmall: 'w-8 h-8 text-xs',
    small: 'w-10 h-10 text-sm',
    medium: 'w-14 h-14 text-base',
    large: 'w-20 h-20 text-lg'
  };

  // Bepaal de kleur van de knop
  const colorClasses = {
    primary: isRecording 
      ? 'bg-red-500 hover:bg-red-600 text-white' 
      : 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: isRecording 
      ? 'bg-red-500 hover:bg-red-600 text-white' 
      : 'bg-secondary-600 hover:bg-secondary-700 text-white',
    success: isRecording 
      ? 'bg-red-500 hover:bg-red-600 text-white' 
      : 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  // Combineer de klassen
  const buttonClasses = `
    ${sizeClasses[size] || sizeClasses.medium}
    ${colorClasses[color] || colorClasses.primary}
    rounded-full flex items-center justify-center shadow-lg
    transition-all duration-200 ease-in-out
    ${isRecording ? 'animate-pulse' : ''}
    ${disabled || !isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  // Klik handler
  const handleClick = () => {
    if (disabled || !isSupported) return;
    
    if (isListening || isRecording) {
      console.log("Handmatig stoppen met luisteren");
      setShouldTriggerResult(true);
      stopListening();
      setIsRecording(false);
    } else {
      setLocalTranscript('');
      startListening();
      setIsRecording(true);
    }
  };

  // Bepaal of we alleen het icoon moeten tonen (voor xsmall)
  const showIconOnly = size === 'xsmall' || (label === '' && stopLabel === '');

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || !isSupported}
      aria-label={isRecording ? stopLabel : label}
    >
      {isRecording ? (
        showIconOnly ? (
          <FaStop className={size === 'xsmall' ? 'h-4 w-4' : 'h-6 w-6'} />
        ) : (
          <div className="flex flex-col items-center">
            <FaStop className="h-6 w-6" />
            <span className="text-xs mt-1">{stopLabel}</span>
          </div>
        )
      ) : (
        showIconOnly ? (
          <FaMicrophone className={size === 'xsmall' ? 'h-4 w-4' : 'h-6 w-6'} />
        ) : (
          <div className="flex flex-col items-center">
            <FaMicrophone className="h-6 w-6" />
            <span className="text-xs mt-1">{label}</span>
          </div>
        )
      )}
    </button>
  );
};

export default VoiceButton; 