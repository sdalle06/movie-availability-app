import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PaginatedResponse,
  Movie,
  TVShow,
  SearchResultItem,
  WatchProviderResponse,
  WatchProviderListResponse,
  Country
} from '../models/tmdb.models';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private apiUrl = environment.apiUrl;
  private apiKey = environment.apiKey;

  constructor(private http: HttpClient) { }

  searchMovies(query: string): Observable<PaginatedResponse<Movie>> {
    return this.http.get<PaginatedResponse<Movie>>(`${this.apiUrl}/search/movie`, {
      params: {
        api_key: this.apiKey,
        query: query,
        include_adult: 'false'
      }
    });
  }

  searchTVShows(query: string): Observable<PaginatedResponse<TVShow>> {
    return this.http.get<PaginatedResponse<TVShow>>(`${this.apiUrl}/search/tv`, {
      params: {
        api_key: this.apiKey,
        query: query,
        include_adult: 'false'
      }
    });
  }

  searchMulti(query: string): Observable<PaginatedResponse<SearchResultItem>> {
    return this.http.get<PaginatedResponse<SearchResultItem>>(`${this.apiUrl}/search/multi`, {
      params: {
        api_key: this.apiKey,
        query: query,
        include_adult: 'false'
      }
    });
  }

  getMovieDetails(movieId: number): Observable<Movie> {
    return this.http.get<Movie>(`${this.apiUrl}/movie/${movieId}`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  getTVDetails(tvId: number): Observable<TVShow> {
    return this.http.get<TVShow>(`${this.apiUrl}/tv/${tvId}`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  getMovieWatchProviders(movieId: number): Observable<WatchProviderResponse> {
    return this.http.get<WatchProviderResponse>(`${this.apiUrl}/movie/${movieId}/watch/providers`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  getTVWatchProviders(tvId: number): Observable<WatchProviderResponse> {
    return this.http.get<WatchProviderResponse>(`${this.apiUrl}/tv/${tvId}/watch/providers`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.apiUrl}/configuration/countries`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  getWatchProvidersByRegion(region: string = 'US'): Observable<WatchProviderListResponse> {
    return this.http.get<WatchProviderListResponse>(`${this.apiUrl}/watch/providers/movie`, {
      params: {
        api_key: this.apiKey,
        watch_region: region
      }
    });
  }

  getTVWatchProvidersByRegion(region: string = 'US'): Observable<WatchProviderListResponse> {
    return this.http.get<WatchProviderListResponse>(`${this.apiUrl}/watch/providers/tv`, {
      params: {
        api_key: this.apiKey,
        watch_region: region
      }
    });
  }

  discover(type: 'movie' | 'tv', providerIds: number[], region: string, sortBy: string, extraParams?: Record<string, string>): Observable<PaginatedResponse<SearchResultItem>> {
    return this.http.get<PaginatedResponse<SearchResultItem>>(`${this.apiUrl}/discover/${type}`, {
      params: {
        api_key: this.apiKey,
        with_watch_providers: providerIds.join('|'),
        watch_region: region,
        sort_by: sortBy,
        include_adult: 'false',
        ...extraParams
      }
    });
  }
}
