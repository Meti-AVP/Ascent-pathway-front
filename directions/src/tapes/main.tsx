import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vt323/400.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import '@fontsource-variable/hanken-grotesk/wght-italic.css';
import '@fontsource/permanent-marker/400.css';
import './styles/base.css';
import './styles/home.css';
import './styles/journey.css';
import './styles/studio.css';
import './styles/builder.css';
import { App } from './App';

// Entry for the Tapes direction: the camcorder / VHS-tape experience translated to ASCENT.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
