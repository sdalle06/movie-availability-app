import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MovieService } from './movie.service';
import { environment } from '../../environments/environment';

describe('MovieService', () => {
  let service: MovieService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const apiKey = environment.apiKey;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MovieService]
    });
    service = TestBed.inject(MovieService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verify that no unmatched requests are outstanding
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('searchMovies', () => {
    it('should make a GET request to search movies', () => {
      const mockResponse = {
        results: [
          { id: 1, title: 'Test Movie 1' },
          { id: 2, title: 'Test Movie 2' }
        ]
      };
      const query = 'test';

      service.searchMovies(query).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/search/movie?api_key=${apiKey}&query=${query}&include_adult=false`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getMovieDetails', () => {
    it('should make a GET request to fetch movie details', () => {
      const mockResponse = { id: 123, title: 'Test Movie', overview: 'Test overview' };
      const movieId = 123;

      service.getMovieDetails(movieId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/movie/${movieId}?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getMovieWatchProviders', () => {
    it('should make a GET request to fetch movie watch providers', () => {
      const mockResponse = {
        results: {
          US: {
            flatrate: [{ provider_id: 8, provider_name: 'Netflix' }]
          }
        }
      };
      const movieId = 123;

      service.getMovieWatchProviders(movieId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/movie/${movieId}/watch/providers?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getCountries', () => {
    it('should make a GET request to fetch countries', () => {
      const mockResponse = [
        { iso_3166_1: 'US', english_name: 'United States' },
        { iso_3166_1: 'FR', english_name: 'France' }
      ];

      service.getCountries().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/configuration/countries?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getWatchProviders', () => {
    it('should make a GET request to fetch watch providers with default region', () => {
      const mockResponse = {
        results: [
          { provider_id: 8, provider_name: 'Netflix' },
          { provider_id: 9, provider_name: 'Amazon Prime' }
        ]
      };

      service.getWatchProviders().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/watch/providers/movie?api_key=${apiKey}&watch_region=US`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should make a GET request to fetch watch providers with specified region', () => {
      const mockResponse = {
        results: [
          { provider_id: 8, provider_name: 'Netflix' },
          { provider_id: 9, provider_name: 'Amazon Prime' }
        ]
      };
      const region = 'FR';

      service.getWatchProviders(region).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/watch/providers/movie?api_key=${apiKey}&watch_region=${region}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getWatchProvidersByRegion', () => {
    it('should make a GET request to fetch watch providers by region', () => {
      const mockResponse = {
        results: [
          { provider_id: 8, provider_name: 'Netflix' },
          { provider_id: 9, provider_name: 'Amazon Prime' }
        ]
      };
      const region = 'FR';

      service.getWatchProvidersByRegion(region).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/watch/providers/movie?api_key=${apiKey}&watch_region=${region}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
