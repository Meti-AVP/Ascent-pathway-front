import { createContext, useContext, useEffect, useRef } from 'react';
import type { KeyHint } from './BottomBar';

/**
 * A screen can take over the right-hand hints of the bottom bar while it is mounted — the
 * rewards screen shows ←→ SELECT · ENTER GO · Z INSPECT · ESC BACK, for example. App owns the
 * bar; a screen only says what it wants shown.
 */
export const PageHintsContext = createContext<(hints: KeyHint[] | null) => void>(() => {});

/**
 * Show `hints` in the bottom bar while the calling component is mounted (null gives the bar back
 * to App). The hints are compared by their keys and labels, so passing a fresh array with fresh
 * handlers on every render is fine: the bar is only updated when what it shows changes, and a
 * press always runs the latest handler.
 */
export function usePageHints(hints: KeyHint[] | null) {
  const set = useContext(PageHintsContext);
  const latest = useRef(hints);
  latest.current = hints;
  const signature = hints ? hints.map((h) => `${h.keys}\u0000${h.label}`).join('\u0001') : '';

  useEffect(() => {
    const now = latest.current;
    set(
      now
        ? now.map((h, i) => ({
            keys: h.keys,
            label: h.label,
            onPress: () => latest.current?.[i]?.onPress?.(),
          }))
        : null,
    );
  }, [set, signature]);

  useEffect(() => () => set(null), [set]);
}

/**
 * What the bar's Esc hint does: exactly what pressing Esc does. The event goes through the same
 * listeners as a real key, so a screen that handles Esc itself (the stage detail going back to
 * the map, a side panel closing) wins over App's "Esc goes home".
 *
 * It is dispatched on the body, not on window: an event aimed at window itself runs window's
 * listeners in the order they were added, capture or not, so App's "go home" (added first)
 * would run before a screen's capture-phase handler. From the body it travels like a real key
 * press: window's capture listeners first, the bubbling ones last.
 */
export function pressEscape() {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
}
