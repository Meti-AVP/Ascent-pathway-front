import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/geist-mono';
import './onyx.css';
import { App } from './App';

// Entry for the Onyx direction: black glass, cinematic light, one clear action per screen.
// Fonts are loaded before the first paint so SplitText measures the real glyphs.
const fonts = Promise.all([
  document.fonts.load('600 72px "Unbounded Variable"'),
  document.fonts.load('500 16px "Inter Tight Variable"'),
  document.fonts.load('600 16px "Inter Tight Variable"'),
  document.fonts.load('500 12px "Geist Mono Variable"'),
]);
const timeout = new Promise((r) => setTimeout(r, 1500));

Promise.race([fonts, timeout]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
