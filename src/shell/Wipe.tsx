import { useLayoutEffect, useRef } from 'react';
import './wipe.css';

/** Time from the start of the wipe until the screen is fully covered — swap the screen here. */
export const WIPE_COVER_MS = 330;
/** Total length of the wipe. */
export const WIPE_TOTAL_MS = 860;

/** The theme tokens the wipe paints with (wipe.css). */
const PINNED = ['--page', '--grain', '--counter', '--heat', '--go', '--hi', '--lo'];

/**
 * The screen change of the reference menu: a leaning slab crosses the screen,
 * led by a flash of the action colour. Mount it with a fresh `key` to play it.
 */
export function Wipe() {
  const ref = useRef<HTMLDivElement>(null);

  // The theme toggle flips the theme while the wipe covers the screen. The wipe keeps the colours
  // it came in with, so the slab stays one colour from entry to exit.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const css = getComputedStyle(el);
    for (const name of PINNED) el.style.setProperty(name, css.getPropertyValue(name));
  }, []);

  return (
    <div ref={ref} className="wipe" aria-hidden="true">
      <div className="wipe-run">
        <i className="wipe-tail" />
        <i className="wipe-body" />
        <i className="wipe-lead" />
        <i className="wipe-flash" />
      </div>
    </div>
  );
}
