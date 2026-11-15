import { useEffect, useState, type CSSProperties } from 'react';
import { buildJourney, pathway, stages, type BuildStage, type Stage } from '../data';
import { coverUrl, type CoverSpec } from './draw';

export function stageSpec(s: Stage): CoverSpec {
  return { key: s.id, n: s.n, total: stages.length, type: s.type, title: s.title, art: s.art, status: s.status, result: s.result, pathway: pathway.name };
}

export function buildSpec(b: BuildStage, i: number, total: number): CoverSpec {
  return { key: `${b.id}-${i}-${total}-${b.title}`, n: i + 1, total, type: b.type, title: b.title, art: b.art, status: 'draft', pathway: 'Product Leadership' };
}

export function useCoverUrl(spec: CoverSpec | null) {
  const [url, setUrl] = useState<string | null>(null);
  const key = spec?.key;
  useEffect(() => {
    if (!spec) return;
    let live = true;
    void coverUrl(spec).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url;
}

type Props = {
  spec: CoverSpec;
  className?: string;
  style?: CSSProperties;
  locked?: boolean; // shrink-wrapped, dimmed
  label?: string; // '' = decorative (the parent already names it)
};

/** A VHS sleeve: the painted cover, a plastic case edge, scanlines, and shrink-wrap when locked. */
export function TapeCover({ spec, className, style, locked, label }: Props) {
  const url = useCoverUrl(spec);
  return (
    <div
      className={`tp-cover ${locked ? 'is-locked' : ''} ${url ? 'is-ready' : ''} ${className ?? ''}`}
      style={style}
      {...(label === '' ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label ?? `Tape ${spec.n}: ${spec.title}` })}
    >
      <div className="tp-cover__case">
        {url ? <img src={url} alt="" draggable={false} /> : <div className="tp-cover__blank" />}
        <span className="tp-cover__scan" />
        <span className="tp-cover__sheen" />
        {locked && (
          <span className="tp-cover__wrap">
            <span className="tp-cover__seal">
              <b>SEALED</b>
              <i>LOCKED</i>
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export function journeySpecs() {
  return stages.map(stageSpec);
}
export function builderSpecs(list: BuildStage[] = buildJourney.stages) {
  return list.map((b, i) => buildSpec(b, i, list.length));
}
