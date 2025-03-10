import { lazy, Suspense } from 'react';

// Lazy load de VoiceButton
const VoiceButton = lazy(() => import('./VoiceButton'));

// Laadcomponent voor tijdens het laden van de VoiceButton
const VoiceButtonLoadingFallback = (props) => (
  <button 
    className={`flex items-center justify-center p-3 rounded-full bg-primary-600 text-white shadow-lg ${props.className || ''}`}
    style={props.style}
    disabled
  >
    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </button>
);

/**
 * Lazy-loaded VoiceButton wrapper
 */
const LazyVoiceButton = (props) => {
  return (
    <Suspense fallback={<VoiceButtonLoadingFallback {...props} />}>
      <VoiceButton {...props} />
    </Suspense>
  );
};

export default LazyVoiceButton; 