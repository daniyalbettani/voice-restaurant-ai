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
    recognition.continuous = true;       // Keep listening through pauses
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    let finalTranscript = '';
    let silenceTimer = null;

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => {
      setListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
      
      const trimmed = finalTranscript.trim();
      if (trimmed) {
        if (onResultRef.current) onResultRef.current(trimmed);
      } else {
        if (onResultRef.current) onResultRef.current('__no_speech__');
      }
    };

    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      setListening(false);
      if (e.error === 'no-speech' && !finalTranscript.trim()) {
        if (onResultRef.current) onResultRef.current('__no_speech__');
      }
    };

    recognition.onresult = (event) => {
      let currentResult = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentResult += event.results[i][0].transcript + ' ';
        }
      }
      finalTranscript += currentResult;

      // Reset the silence timer on each new speech segment
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop(); // Stops capturing and triggers onend
      }, 3500); // 3.5 seconds of absolute silence means user is done speaking
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return { listening, startListening, stopListening, speak };
};
