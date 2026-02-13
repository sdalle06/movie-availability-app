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
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('searchMovies', () => {
    it('should make a GET request to search movies', () => {
      const mockResponse = {
        page: 1,
        results: [
          { id: 1, title: 'Test Movie 1' },
          { id: 2, title: 'Test Movie 2' }
        ],
        total_pages: 1,
        total_results: 2
      };
      const query = 'test';

      service.searchMovies(query).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/search/movie?api_key=${apiKey}&query=${query}&include_adult=false`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('searchTVShows', () => {
    it('should make a GET request to search TV shows', () => {
      const mockResponse = {
        page: 1,
        results: [{ id: 1, name: 'Test Show' }],
        total_pages: 1,
        total_results: 1
      };
      const query = 'test';

      service.searchTVShows(query).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/search/tv?api_key=${apiKey}&query=${query}&include_adult=false`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('searchMulti', () => {
    it('should make a GET request to multi search', () => {
      const mockResponse = {
        page: 1,
        results: [{ id: 1, title: 'Test', media_type: 'movie' }],
        total_pages: 1,
        total_results: 1
      };
      const query = 'test';

      service.searchMulti(query).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/search/multi?api_key=${apiKey}&query=${query}&include_adult=false`
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
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/movie/${movieId}?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getTVDetails', () => {
    it('should make a GET request to fetch TV details', () => {
      const mockResponse = { id: 456, name: 'Test Show', overview: 'Test overview' };
      const tvId = 456;

      service.getTVDetails(tvId).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/tv/${tvId}?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getMovieWatchProviders', () => {
    it('should make a GET request to fetch movie watch providers', () => {
      const mockResponse = {
        id: 123,
        results: {
          US: {
            flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/logo.jpg' }]
          }
        }
      };
      const movieId = 123;

      service.getMovieWatchProviders(movieId).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/movie/${movieId}/watch/providers?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getTVWatchProviders', () => {
    it('should make a GET request to fetch TV watch providers', () => {
      const mockResponse = {
        id: 456,
        results: {
          FR: {
            flatrate: [{ provider_id: 337, provider_name: 'Disney+', logo_path: '/disney.jpg' }]
          }
        }
      };
      const tvId = 456;

      service.getTVWatchProviders(tvId).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/tv/${tvId}/watch/providers?api_key=${apiKey}`
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
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/configuration/countries?api_key=${apiKey}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getWatchProvidersByRegion', () => {
    it('should make a GET request with default region US', () => {
      const mockResponse = {
        results: [
          { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }
        ]
      };

      service.getWatchProvidersByRegion().subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/watch/providers/movie?api_key=${apiKey}&watch_region=US`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should make a GET request with specified region', () => {
      const mockResponse = {
        results: [
          { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }
        ]
      };
      const region = 'FR';

      service.getWatchProvidersByRegion(region).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/watch/providers/movie?api_key=${apiKey}&watch_region=${region}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getTVWatchProvidersByRegion', () => {
    it('should make a GET request with default region US', () => {
      const mockResponse = {
        results: [
          { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }
        ]
      };

      service.getTVWatchProvidersByRegion().subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/watch/providers/tv?api_key=${apiKey}&watch_region=US`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
