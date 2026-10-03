import { useEffect, useState } from 'react';

export interface Route {
  page: string;
  param?: string;
  query: URLSearchParams;
}

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const [page, param] = path.split('/');
  return { page: page || 'atlas', param, query: new URLSearchParams(qs ?? '') };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path: string) => {
  window.location.hash = '#/' + path.replace(/^\//, '');
};
