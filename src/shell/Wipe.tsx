import './wipe.css';

/** Time from the start of the wipe until the screen is fully covered — swap the screen here. */
export const WIPE_COVER_MS = 330;
/** Total length of the wipe. */
export const WIPE_TOTAL_MS = 860;

/**
 * The screen change of the reference menu: a leaning slab crosses the screen,
 * led by a flash of the action colour. Mount it with a fresh `key` to play it.
 */
export function Wipe() {
  return (
    <div className="wipe" aria-hidden="true">
      <div className="wipe-run">
        <i className="wipe-tail" />
        <i className="wipe-body" />
        <i className="wipe-lead" />
        <i className="wipe-flash" />
      </div>
    </div>
  );
}
