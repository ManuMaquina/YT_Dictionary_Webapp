import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Dynamic route — Angular can't prerender this at build time because
    // it doesn't know what words exist. RenderMode.Server renders it
    // on the server on-demand when a user visits /dictionary/some-term.
    path: 'dictionary/:term',
    renderMode: RenderMode.Server,
  },
  {
    // All other routes (/, /dictionary, /auth/login, etc.) are static
    // and can be fully prerendered into HTML files at build time.
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
