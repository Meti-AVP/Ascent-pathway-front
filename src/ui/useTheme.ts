import { useCallback, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'ascent.theme';

function stored(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * The black theme is the main one and the default; the white theme is a choice the viewer makes
 * and keeps. The value lives on <html data-theme> (set before first paint by index.html) so
 * every stylesheet can read it.
 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setState] = useState<Theme>(stored);
  const set = useCallback((next: Theme) => {
    setState(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice simply lasts for this visit */
    }
  }, []);
  return [theme, set];
}
