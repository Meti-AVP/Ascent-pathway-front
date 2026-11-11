import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { CAST, SOURCE_COUNT, type Avatar } from '../../data/cast';
import { Icon } from '../../ui/Icon';
import './cast-review.css';

type Props = { current: string; onUse: (key: string) => void };

/** Source model under, adapted avatar over; the handle uncovers one or the other. */
function Compare({ avatar, order }: { avatar: Avatar; order: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [settled, setSettled] = useState(false);

  // the arrival sweep ends at the middle; after that the handle follows the pointer exactly
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 1500 + order * 140);
    return () => window.clearTimeout(id);
  }, [order]);

  const fromPointer = useCallback((clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  }, []);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setSettled(true);
    fromPointer(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) fromPointer(e.clientX);
  };
  const onUp = () => setDragging(false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    if (e.key === 'ArrowLeft') setSplit((v) => Math.max(0, v - step));
    else if (e.key === 'ArrowRight') setSplit((v) => Math.min(100, v + step));
    else if (e.key === 'Home') setSplit(0);
    else if (e.key === 'End') setSplit(100);
    else return;
    setSettled(true);
    e.preventDefault();
  };

  return (
    <div
      ref={frame}
      className={`cmp${dragging ? ' is-dragging' : ''}${settled ? ' is-settled' : ''}`}
      style={{ '--split': `${split}%`, '--o': order } as CSSProperties}
      role="slider"
      tabIndex={0}
      aria-label={`${avatar.name}: compare the source model with the adapted avatar`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(split)}
      aria-valuetext={`${Math.round(split)}% source model`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
    >
      <img className="cmp-img" src={avatar.after} alt={`${avatar.name}, adapted`} draggable={false} />
      <div className="cmp-before">
        <img className="cmp-img" src={avatar.before} alt={`${avatar.name}, source model`} draggable={false} />
      </div>
      <span className="cmp-chip is-before">Source</span>
      <span className="cmp-chip is-after">Adapted</span>
      <span className="cmp-handle" aria-hidden="true">
        <i>
          <Icon name="left" />
          <Icon name="right" />
        </i>
      </span>
    </div>
  );
}

/**
 * Review board for the Blender work. The roster screen itself is a later section;
 * this is where the adaptation of each character is signed off first.
 */
export function CastReview({ current, onUse }: Props) {
  return (
    <div className="cast">
      <div className="cast-skin" aria-hidden="true">
        <i className="k k-facets" />
        <i className="k k-halftone" />
        <i className="k k-grain" />
      </div>
      <header className="cast-head">
        <span className="k-serial" aria-hidden="true">
          Review board · {String(CAST.length).padStart(2, '0')} / {String(SOURCE_COUNT).padStart(2, '0')}
        </span>
        <h1 className="cast-title display">Avatars</h1>
        <p className="cast-lead">
          Adaptation review. {CAST.length} of {SOURCE_COUNT} source characters are done. Drag a handle to compare,
          then put any of them on the home screen to see it move.
        </p>
      </header>

      <div className="cast-row">
        {CAST.map((avatar, i) => {
          const active = avatar.key === current;
          return (
            <article key={avatar.key} className="cast-card" style={{ '--o': i } as CSSProperties}>
              <span className="card-skin" aria-hidden="true">
                <i className="k k-facets is-b" />
                <i className="k k-hatch is-fade" />
                <i className="k k-ghost" data-k={String(i + 1).padStart(2, '0')} />
                <i className="k k-bevel" />
              </span>
              <Compare avatar={avatar} order={i} />
              <div className="cast-info">
                <h2 className="cast-name display">{avatar.name}</h2>
                <p className="cast-track">{avatar.track}</p>
                <ul className="cast-edits">
                  {avatar.edits.map((edit) => (
                    <li key={edit}>{edit}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`btn is-small ${active ? 'is-on' : 'is-white'}`}
                  onClick={() => onUse(avatar.key)}
                >
                  <span className="btn-fx" aria-hidden="true">
                    <i className="k k-hatch is-fade" />
                  </span>
                  <span className="btn-label">
                    <Icon name={active ? 'go' : 'right'} />
                    {active ? 'On the home screen' : 'Use on home'}
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
