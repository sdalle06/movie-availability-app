# StreamRadar

**Find out which streaming platforms carry the movies and TV shows you want — across countries.**

StreamRadar helps casual viewers in France and the rest of Europe answer "what should I watch tonight?" across their streaming subscriptions. Search any title and instantly see which platforms (Netflix, Prime Video, Disney+, Apple TV+, Paramount+, Max, Crunchyroll) offer it, and how availability changes from one region to another. Built on [The Movie Database (TMDB)](https://www.themoviedb.org/) API.

🔗 **Live app:** https://sdalle06.github.io/movie-availability-app/

## Features

- **Cross-platform search** — look up movies and TV shows and see streaming availability per platform.
- **Cross-region availability** — compare where a title streams across countries, surfacing what no single streaming app can show.
- **Platform filtering** — pick your subscriptions; results highlight what's available to you.
- **Watchlist** — save titles (including ones not yet streaming) and get re-checked on app open; titles that newly become streamable are flagged.
- **Recent searches** — quick re-run of past lookups from a dropdown and a panel on the search page.
- **No accounts** — all personalization (selected platforms, watchlist, history) lives in the browser via `localStorage`.

## Tech Stack

- **Angular 19.2** with standalone components (no NgModules)
- **Angular Material 19** for UI
- **TypeScript 5.7** (strict mode), **RxJS 7.8**, **SCSS**
- **Karma/Jasmine** for unit tests
- **TMDB API v3** as the data source

## Getting Started

Requires Node.js and npm. The app reads the TMDB API key from `src/environments/`.

```bash
npm install
npm start          # dev server at http://localhost:4200
```

## Available Scripts

- `npm start` — dev server at `localhost:4200`
- `npm test` — unit tests (Karma + Jasmine)
- `npm run build` — production build (output in `dist/`)
- `npm run deploy` — production build with the GitHub Pages base href

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys to GitHub Pages on every push to `main`. The build copies `index.html` to `404.html` for SPA routing support on GitHub Pages.

## Project Structure

The app is a single Angular SPA. Routes:

- `/movies` — search and results
- `/movies/:id` — movie detail with per-country / per-platform availability
- `/tv/:id` — TV show detail (reuses the detail component)
- `/watchlist` — saved titles with availability re-check

A single `MovieService` wraps all TMDB calls (search, details, watch providers, provider listings, region configuration). See [`CLAUDE.md`](./CLAUDE.md) for a fuller architecture overview.
