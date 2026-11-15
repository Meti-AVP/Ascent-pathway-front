import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import './ember.css';
import './pages.css';
import { App } from './App';

// Entry for the Ember direction: obsidian cliffs, stage pedestals on a path of fire.
// The first render waits for Plus Jakarta Sans (at most 800 ms) so text does not reflow on load.
const fontReady = Promise.race([
  Promise.all(['500 12px "Plus Jakarta Sans Variable"', '700 50px "Plus Jakarta Sans Variable"'].map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 800)),
]);
fontReady.catch(() => {}).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
