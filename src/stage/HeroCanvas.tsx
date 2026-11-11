import { useEffect, useRef } from 'react';
import { HeroStage, type Framing, type StageTheme } from './HeroStage';

type Props = {
  url: string;
  framing: Framing;
  yaw?: number;
  theme?: StageTheme;
  className?: string;
  /** pointer position is read from the window so the character follows the cursor over the whole screen */
  onReady?: () => void;
  onProgress?: (fraction: number) => void;
  /** bumping this number triggers the one-shot personality move */
  flourishKey?: number;
};

export function HeroCanvas({ url, framing, yaw, theme = 'dark', className, onReady, onProgress, flourishKey = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HeroStage | null>(null);
  const ready = useRef(onReady);
  const progress = useRef(onProgress);
  ready.current = onReady;
  progress.current = onProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = new HeroStage(canvas, {
      url,
      framing,
      yaw,
      theme,
      reducedMotion,
      onProgress: (f) => progress.current?.(f),
    });
    stageRef.current = stage;
    if (import.meta.env.DEV) (window as unknown as { __stage?: HeroStage }).__stage = stage; // live tuning from the console
    let alive = true;
    stage
      .load()
      .then(() => alive && ready.current?.())
      .catch((err) => console.error('hero stage failed to load', err));

    const onMove = (e: PointerEvent) => {
      stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onLeave = () => stage.setPointer(0, 0);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      alive = false;
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      stage.dispose();
      stageRef.current = null;
    };
    // the stage is rebuilt only when the model changes; framing is pushed below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    stageRef.current?.setFraming(framing);
  }, [framing]);

  useEffect(() => {
    stageRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (flourishKey > 0) stageRef.current?.flourish();
  }, [flourishKey]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
