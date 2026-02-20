# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Movie Availability App — an Angular SPA that lets users search for movies and TV shows, then see which streaming platforms offer them across different countries. Built on the TMDB (The Movie Database) API v3. Primarily focused on France/European region availability.

## Commands

- `npm start` — dev server at localhost:4200
- `npm test` — unit tests (Karma + Jasmine, opens Chrome, runs in watch mode)
- `npm run build` — production build (output in `dist/`)
- `npm run deploy` — production build with GitHub Pages base href (`/movie-availability-app/`)
- `ng generate component component-name` — scaffold a new standalone component

## Tech Stack

- **Angular 19.2** with standalone components (no NgModules)
- **Angular Material 19** for UI components
- **TypeScript 5.7** (strict mode enabled)
- **RxJS 7.8** for async data flow
- **SCSS** for styling
- **Karma/Jasmine** for unit tests, **jasmine-marbles** for RxJS testing

## Architecture

### Routing (`src/app/app.routes.ts`)

All routes use standalone components loaded eagerly:
- `/movies` — search & results page (MovieListComponent)
- `/movies/:id` — movie detail page (MovieDetailsComponent)
- `/tv/:id` — TV show detail page (reuses MovieDetailsComponent)
- Root redirects to `/movies`, wildcard also redirects to `/movies`

MovieDetailsComponent determines content type (movie vs TV) from the route segment.

### Service Layer (`src/app/services/movie.service.ts`)

Single `MovieService` handles all TMDB API calls. API key and base URL come from environment files (`src/environments/`). Key endpoint groups:
- **Search**: `/search/movie`, `/search/tv`, `/search/multi`
- **Details**: `/movie/{id}`, `/tv/{id}`
- **Watch providers**: `/movie/{id}/watch/providers`, `/tv/{id}/watch/providers`
- **Provider listings**: `/watch/providers/movie`, `/watch/providers/tv` (region-filtered)
- **Configuration**: `/configuration/countries`

### Components (`src/app/components/`)

- **MovieListComponent** — main page orchestrating search, platform filtering, and result display
- **MovieDetailsComponent** — detail view with watch provider availability organized by country/platform
- **SearchComponent** — search input with content type toggle (All/Movies/TV), emits events upward
- **PlatformSelectorComponent** — streaming service picker (Netflix, Prime Video, Disney+, Apple TV+, Paramount+, Crunchyroll, Max); persists selection to `localStorage` under key `selectedPlatforms`
- **MovieCardComponent** — result card with poster, rating, year, France availability badge; contains hardcoded genre ID-to-name mapping
- **CountrySelectorComponent** — country/region picker loaded from TMDB API
- **HeaderComponent** — top nav bar with Material Toolbar

### State Management

No dedicated state library. State lives in:
- **Component properties** for UI state
- **localStorage** (`selectedPlatforms` key) for persisted streaming platform selection
- **RxJS Observables** for async API data

### Styling

Global styles in `src/styles.scss` with CSS custom properties. Fonts: Poppins (body), Montserrat (headings). Responsive breakpoints at 768px and 480px. Components use scoped SCSS files.

### Environment Config (`src/environments/`)

Three files: `environment.ts` (base), `environment.development.ts`, `environment.prod.ts`. All contain `apiKey`, `apiUrl`, `imageBaseUrl`, `posterSize`, `backdropSize`.

## Design Philosophy

StreamRadar helps users answer "what should I watch tonight?" across their streaming platforms.

- **Target user**: casual viewer in France/Europe with multiple streaming subscriptions
- **Core value**: surface content users wouldn't find on their own
- **Key differentiator**: cross-platform, cross-region availability — show what no single streaming app can
- **UX principle**: don't replicate Netflix's homepage — provide unique cross-platform insights
- **No user accounts**: all personalization is based on selected platforms (localStorage), not watch history

### Page Roles

- **Search** (`/movies`): direct lookup — user knows what they want
- **Inspiration** (`/inspiration`): discovery — help users find something unexpected
- **Browse** (`/browse`): exploration — structured filtering and sorting

## Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys to GitHub Pages on push to `main`. The build copies `index.html` to `404.html` for SPA routing support on GitHub Pages.

## Angular CLI & Build Config

- `angular.json` sets SCSS as default style format
- Bundle budgets: 500kB warning / 1MB error for initial chunk
- `.editorconfig`: 2-space indentation, single quotes for TypeScript
