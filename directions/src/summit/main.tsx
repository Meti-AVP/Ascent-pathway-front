import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/sora';
import './summit.css';
import { App } from './App';

// Entry for the Summit direction: a dark, glassy, cinematic product UI with painted key art.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
