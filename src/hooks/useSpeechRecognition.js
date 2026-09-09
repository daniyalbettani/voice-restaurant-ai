import { useState, useRef } from 'react';

export const useSpeechRecognition = (onResult, lang = 'en-US') => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const speak = (message) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = lang.startsWith('ur') ? 'en-US' : lang; // TTS stays English
    utter.rate = 0.95;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  };

  const startListening = (overrideLang) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported. Please use Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = overrideLang || lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3; // get up to 3 guesses for accent tolerance

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => setListening(false);
    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      setListening(false);
      if (e.error === 'no-speech') {
        if (onResultRef.current) onResultRef.current('__no_speech__');
      }
    };

    recognition.onresult = (event) => {
      // Use the best alternative
      const transcript = event.results[0][0].transcript;
      setListening(false);
      if (onResultRef.current) onResultRef.current(transcript);
    };

    recognition.start();
  };

  return { listening, startListening, speak };
};
