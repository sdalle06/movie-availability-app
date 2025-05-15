import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private apiUrl = environment.apiUrl;
  private apiKey = environment.apiKey;

  constructor(private http: HttpClient) { }

  /**
   * Search for movies by query
   * @param query Search query
   * @returns Observable of search results
   */
  searchMovies(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search/movie`, {
      params: {
        api_key: this.apiKey,
        query: query,
        include_adult: 'false'
      }
    });
  }

  /**
   * Get movie details by ID
   * @param movieId Movie ID
   * @returns Observable of movie details
   */
  getMovieDetails(movieId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/movie/${movieId}`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  /**
   * Get movie watch providers by ID and region
   * @param movieId Movie ID
   * @returns Observable of watch providers
   */
  getMovieWatchProviders(movieId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/movie/${movieId}/watch/providers`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  /**
   * Get list of countries
   * @returns Observable of countries
   */
  getCountries(): Observable<any> {
    return this.http.get(`${this.apiUrl}/configuration/countries`, {
      params: {
        api_key: this.apiKey
      }
    });
  }

  /**
   * Get list of watch providers
   * @param region Region code (e.g., 'US')
   * @returns Observable of watch providers
   */
  getWatchProviders(region: string = 'US'): Observable<any> {
    return this.http.get(`${this.apiUrl}/watch/providers/movie`, {
      params: {
        api_key: this.apiKey,
        watch_region: region
      }
    }).pipe(
      tap((response: any) => {
        console.log(`TMDB API Response - All Providers (${region}):`, response);
        if (response && response.results) {
          // Log providers with 'Prime' in their name
          const primeProviders = response.results.filter((p: any) => 
            p.provider_name.includes('Prime') || p.provider_id === 9 || p.provider_id === 119
          );
          console.log(`Prime Video related providers in global list (${region}):`, 
            primeProviders.map((p: any) => `${p.provider_name} (ID: ${p.provider_id})`))
        }
      })
    );
  }
  
  /**
   * Get list of watch providers by region
   * @param region Region code (e.g., 'FR' for France)
   * @returns Observable of watch providers available in the specified region
   */
  getWatchProvidersByRegion(region: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/watch/providers/movie`, {
      params: {
        api_key: this.apiKey,
        watch_region: region
      }
    }).pipe(
      tap((response: any) => {
        console.log(`TMDB API Response - Region Providers (${region}):`, response);
        if (response && response.results) {
          // Log all providers in this region
          console.log(`All providers in ${region}:`, 
            response.results.map((p: any) => `${p.provider_name} (ID: ${p.provider_id})`))
          
          // Log providers with 'Prime' in their name
          const primeProviders = response.results.filter((p: any) => 
            p.provider_name.includes('Prime') || p.provider_id === 9 || p.provider_id === 119
          );
          console.log(`Prime Video related providers in ${region}:`, 
            primeProviders.length > 0 ? 
              primeProviders.map((p: any) => `${p.provider_name} (ID: ${p.provider_id})`) : 
              'None found')
        }
      })
    );
  }
}
