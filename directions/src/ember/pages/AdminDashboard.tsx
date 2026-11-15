// Admin home: the concept image, rebuilt. Coordinates are concept pixels (1672 x 941).
import { ArrowRight, ArrowUp, ChartColumnIncreasing, Clock3, Play, RefreshCw, SquarePlus, Zap } from 'lucide-react';
import { BookFill, GridIcon, ImpactIcon, TemplatesIcon, UsersFill } from '../icons';
import { REVIEW_QUEUE } from '../data';
import { ART, World } from '../World';
import { go, useToast } from '../App';

export function AdminDashboard() {
  const toast = useToast();
  return (
    <>
      <World />
      <section className="em-hero" aria-labelledby="em-dash-title">
        <p className="em-eyebrow">Pathway Builder</p>
        <h1 id="em-dash-title" className="em-h1">
          Design Learning
          <br />
          <span className="em-wide">Journeys</span> That <em>Inspire</em>
        </h1>
        <p className="em-sub">
          Build, customize and launch powerful learning pathways
          <br />
          that turn knowledge into real impact.
        </p>
        <button type="button" className="em-btn em-btn--fire em-hero__cta" onClick={() => go('/admin/builder')}>
          Create New Journey
          <span className="em-btn__disc"><ArrowRight size={14} strokeWidth={2.4} /></span>
        </button>
        <button type="button" className="em-btn em-btn--dark em-hero__demo" onClick={() => toast('The demo reel plays here — not part of this mockup.')}>
          <Play size={14} fill="currentColor" strokeWidth={0} />
          Watch Demo
        </button>
      </section>

      <div className="em-cards em-cards--dash">
        {/* Your Learning Impact */}
        <section className="em-card em-impact" aria-label="Your learning impact">
          <header className="em-card__head">
            <ImpactIcon />
            <h2>Your Learning Impact</h2>
          </header>
          <Ring value={78} />
          <div className="em-impact__ring-label">
            <b>Overall Progress</b>
            <span className="em-up"><ArrowUp size={13} strokeWidth={2.2} /> +12%</span>
          </div>
          <i className="em-impact__div" />
          <ul className="em-stats">
            <li style={{ top: 102 }}>
              <span className="em-stats__disc"><BookFill size={20} /></span>
              <b>12</b>
              <span>Active Pathways</span>
            </li>
            <li style={{ top: 161 }}>
              <span className="em-stats__disc"><UsersFill size={19} /></span>
              <b>3.2K</b>
              <span>Total Learners</span>
            </li>
            <li style={{ top: 220 }}>
              <span className="em-stats__disc"><Clock3 size={19} strokeWidth={1.8} /></span>
              <b>28h</b>
              <span>Learning Time</span>
            </li>
          </ul>
          <AreaChart />
        </section>

        {/* Your Pathways */}
        <section className="em-card em-paths" aria-label="Your pathways">
          <header className="em-card__head">
            <GridIcon />
            <h2>Your Pathways</h2>
            <button type="button" className="em-link" onClick={() => toast('All 12 active pathways — the list view is coming soon in this mockup.')}>
              View All <ArrowRight size={15} strokeWidth={1.9} />
            </button>
          </header>
          {/* the builder holds a different journey (the Product Leadership draft), so this card does not open it */}
          <article className="em-pcard" onClick={() => toast('Product Excellence Journey is published — its pathway view is coming soon in this mockup.')}>
            <div className="em-pcard__img">
              <img src={ART('thumb.webp')} alt="" />
              <div className="em-pcard__bar" role="progressbar" aria-valuenow={92} aria-valuemin={0} aria-valuemax={100} aria-label="Product Excellence Journey completion"><i style={{ width: '92%' }} /></div>
              <div className="em-faces">
                {[0, 1, 2, 3].map((i) => (
                  <img key={i} src={ART(`av${i}.webp`)} alt="" />
                ))}
                <span>+24</span>
              </div>
            </div>
            <h3>Product Excellence<br />Journey</h3>
            <span className="em-pill em-pill--green em-pcard__pill"><RefreshCw size={11} strokeWidth={2.6} /> Published</span>
            <i className="em-pcard__div" />
            <p className="em-pcard__pct"><b>92%</b> Complete</p>
            <button type="button" className="em-pcard__go" aria-label="Open Product Excellence Journey"><ArrowRight size={16} strokeWidth={2} /></button>
          </article>
        </section>

        {/* Quick Actions */}
        <section className="em-card em-qa" aria-label="Quick actions">
          <header className="em-card__head">
            <Zap size={22} strokeWidth={1.8} color="#ef6f2e" />
            <h2>Quick Actions</h2>
          </header>
          <button type="button" className="em-qa__row is-primary" style={{ top: 67 }} onClick={() => go('/admin/builder')}>
            <span className="em-qa__ic"><SquarePlus size={20} strokeWidth={1.6} /></span>
            Build a New Journey
            <span className="em-qa__go"><ArrowRight size={16} strokeWidth={2.2} /></span>
          </button>
          <button type="button" className="em-qa__row" style={{ top: 140 }} onClick={() => toast('Templates library — outside this mockup.')}>
            <span className="em-qa__ic"><TemplatesIcon /></span>
            Browse Templates
            <span className="em-qa__go"><ArrowRight size={16} strokeWidth={1.8} /></span>
          </button>
          <button type="button" className="em-qa__row" style={{ top: 213 }} onClick={() => toast('Analytics — outside this mockup.')}>
            <span className="em-qa__ic"><ChartColumnIncreasing size={20} strokeWidth={1.6} /></span>
            View Analytics
            <span className="em-qa__go"><ArrowRight size={16} strokeWidth={1.8} /></span>
          </button>
        </section>
      </div>
      <span className="em-sr-only">{REVIEW_QUEUE.length} items are waiting in the review queue.</span>
    </>
  );
}

export function Ring({ value, size = 131, thickness = 8.4, children, className = '' }: { value: number; size?: number; thickness?: number; children?: React.ReactNode; className?: string }) {
  return (
    <div className={'em-ring ' + className} style={{ width: size, height: size, ['--v' as string]: value, ['--t' as string]: `${thickness}px` }}>
      <div className="em-ring__track" />
      <div className="em-ring__arc" />
      <i className="em-ring__cap" />
      <i className="em-ring__cap is-end" />
      <div className="em-ring__val">{children ?? `${value}%`}</div>
    </div>
  );
}

function AreaChart() {
  return (
    <svg className="em-area" width="442" height="100" viewBox="0 0 442 100" aria-hidden>
      <defs>
        <linearGradient id="em-area-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9692a" stopOpacity=".18" />
          <stop offset="1" stopColor="#d9692a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="em-area-s" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e07530" stopOpacity="0" />
          <stop offset=".45" stopColor="#e07530" stopOpacity=".38" />
          <stop offset="1" stopColor="#f0904a" stopOpacity=".62" />
        </linearGradient>
      </defs>
      <path d="M0 90 C70 84 140 88 210 92 S 300 94 330 90" stroke="#ffffff" strokeOpacity=".07" fill="none" strokeWidth="1.2" />
      <path d="M236 100 C262 96 284 88 306 84 C324 81 334 86 350 76 C364 68 374 72 388 62 C402 52 410 50 420 40 C430 31 436 28 442 24 L442 100 Z" fill="url(#em-area-f)" />
      <path d="M236 100 C262 96 284 88 306 84 C324 81 334 86 350 76 C364 68 374 72 388 62 C402 52 410 50 420 40 C430 31 436 28 442 24" stroke="url(#em-area-s)" fill="none" strokeWidth="1.2" />
      <path d="M270 100 C292 94 310 92 330 90 C348 88 360 80 376 82 C394 84 404 70 418 64 C428 60 436 60 442 58" stroke="url(#em-area-s)" strokeOpacity=".55" fill="none" strokeWidth="1" />
      <path d="M318 100 C340 96 356 92 372 94 C392 96 404 86 420 82 C430 80 436 79 442 78 L442 100 Z" fill="url(#em-area-f)" opacity=".7" />
    </svg>
  );
}
