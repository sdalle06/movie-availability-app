export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  runtime?: number;
  tagline?: string;
  media_type?: 'movie';
}

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  episode_run_time?: number[];
  number_of_seasons?: number;
  tagline?: string;
  media_type?: 'tv';
}

export type SearchResultItem = (Movie | TVShow) & { media_type?: 'movie' | 'tv' | 'person' };

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

export interface CountryWatchProviders {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface WatchProviderResponse {
  id: number;
  results: Record<string, CountryWatchProviders>;
}

export interface WatchProviderListResponse {
  results: WatchProvider[];
}

export interface Country {
  iso_3166_1: string;
  english_name: string;
  native_name?: string;
}

export interface PlatformAvailability {
  platformId: number;
  platformName: string;
  logoPath: string;
  countries: { countryCode: string; countryName: string }[];
}

export interface WatchlistItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  addedAt: number;
  /** Last known availability on the user's selected platforms (FR region). */
  available: boolean;
  /** Epoch ms of the last availability check; 0 means never checked. */
  lastChecked: number;
  /** True once the "now available" alert has been surfaced, so we don't re-notify. */
  notifiedAvailable: boolean;
}

export interface SearchHistoryEntry {
  query: string;
  contentType: string;
  /** Epoch ms when the search was last performed. */
  at: number;
}
