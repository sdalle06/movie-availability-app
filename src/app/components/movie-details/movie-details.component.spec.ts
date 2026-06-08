import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { MovieDetailsComponent } from './movie-details.component';
import { MovieService } from '../../services/movie.service';

describe('MovieDetailsComponent', () => {
  let component: MovieDetailsComponent;
  let fixture: ComponentFixture<MovieDetailsComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockMovie = {
    id: 123,
    title: 'Test Movie',
    overview: 'Test overview',
    poster_path: '/test.jpg',
    backdrop_path: '/backdrop.jpg',
    release_date: '2023-06-15',
    vote_average: 8.5,
    vote_count: 1000,
    runtime: 148,
    tagline: 'Test tagline',
    genres: [{ id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }]
  };

  const mockWatchProviders = {
    id: 123,
    results: {
      US: {
        flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }]
      },
      FR: {
        flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }]
      }
    }
  };

  const mockCountries = [
    { iso_3166_1: 'US', english_name: 'United States' },
    { iso_3166_1: 'FR', english_name: 'France' }
  ];

  beforeEach(async () => {
    const activatedRouteStub = {
      url: of([{ path: 'movies' }]),
      params: of({ id: '123' }),
      snapshot: { params: { id: '123' } }
    };

    movieServiceSpy = jasmine.createSpyObj('MovieService', [
      'getMovieDetails',
      'getTVDetails',
      'getMovieWatchProviders',
      'getTVWatchProviders',
      'getWatchProvidersByRegion',
      'getCountries'
    ]);

    movieServiceSpy.getMovieDetails.and.returnValue(of(mockMovie as any));
    movieServiceSpy.getMovieWatchProviders.and.returnValue(of(mockWatchProviders as any));
    movieServiceSpy.getCountries.and.returnValue(of(mockCountries as any));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        MovieDetailsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule,
        MatCardModule,
        MatListModule,
        MatButtonModule
      ],
      providers: [
        { provide: MovieService, useValue: movieServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([8]));
    spyOn(localStorage, 'removeItem');

    fixture = TestBed.createComponent(MovieDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load movie details on init', () => {
    expect(movieServiceSpy.getMovieDetails).toHaveBeenCalledWith(123);
    expect(component.movie).toEqual(mockMovie as any);
  });

  it('should determine content type as movie from route', () => {
    expect(component.contentType).toBe('movie');
    expect(component.isMovie).toBeTrue();
    expect(component.isTVShow).toBeFalse();
  });

  it('should display correct content title', () => {
    expect(component.contentTitle).toBe('Test Movie');
  });

  it('should display correct release date', () => {
    expect(component.contentReleaseDate).toBe('2023-06-15');
  });

  it('should load selected platforms from localStorage', () => {
    expect(component.selectedPlatforms).toEqual([8]);
  });

  describe('goBack', () => {
    it('should navigate to /movies', () => {
      component.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/movies']);
    });
  });

  describe('formatRuntime', () => {
    it('should format minutes into hours and minutes', () => {
      expect(component.formatRuntime(148)).toBe('2h 28m');
      expect(component.formatRuntime(90)).toBe('1h 30m');
      expect(component.formatRuntime(45)).toBe('0h 45m');
    });
  });

  describe('getYear', () => {
    it('should return year from valid date string', () => {
      expect(component.getYear('2023-06-15')).toBe('2023');
    });

    it('should return Unknown for null date', () => {
      expect(component.getYear(null)).toBe('Unknown');
    });

    it('should return Unknown for empty date', () => {
      expect(component.getYear('')).toBe('Unknown');
    });
  });

  describe('getFlagEmoji', () => {
    it('should return non-empty string for valid country code', () => {
      const flag = component.getFlagEmoji('FR');
      expect(flag).toBeTruthy();
      expect(flag.length).toBeGreaterThan(0);
    });

    it('should return non-empty string for US', () => {
      const flag = component.getFlagEmoji('US');
      expect(flag).toBeTruthy();
    });
  });

  describe('checkFranceAvailability', () => {
    it('should set isAvailableInFrance to true when matching platforms exist in FR', () => {
      component.selectedPlatforms = [8]; // Netflix
      component.watchProviders = mockWatchProviders.results as any;
      component.checkFranceAvailability();
      expect(component.isAvailableInFrance).toBeTrue();
    });

    it('should set isAvailableInFrance to false when no matching platforms in FR', () => {
      component.selectedPlatforms = [337]; // Disney+ - not in mock FR data
      component.watchProviders = mockWatchProviders.results as any;
      component.checkFranceAvailability();
      expect(component.isAvailableInFrance).toBeFalse();
    });

    it('should set isAvailableInFrance to false when no watch providers', () => {
      component.selectedPlatforms = [8];
      component.watchProviders = null;
      component.checkFranceAvailability();
      expect(component.isAvailableInFrance).toBeFalse();
    });

    it('should set isAvailableInFrance to false when no selected platforms', () => {
      component.selectedPlatforms = [];
      component.watchProviders = mockWatchProviders.results as any;
      component.checkFranceAvailability();
      expect(component.isAvailableInFrance).toBeFalse();
    });
  });

  describe('getGenreNames', () => {
    it('should return comma-separated genre names', () => {
      expect(component.getGenreNames()).toBe('Action, Adventure');
    });

    it('should return empty string when no genres', () => {
      component.movie = { ...mockMovie, genres: [] } as any;
      expect(component.getGenreNames()).toBe('');
    });
  });

  describe('getFullPosterPath', () => {
    it('should return full URL when poster path is provided', () => {
      expect(component.getFullPosterPath('/test.jpg')).toContain('image.tmdb.org');
      expect(component.getFullPosterPath('/test.jpg')).toContain('/test.jpg');
    });

    it('should return placeholder when poster path is null', () => {
      expect(component.getFullPosterPath(null)).toBe('assets/no-image.png');
    });
  });

  describe('getCountryName', () => {
    it('should return country name from loaded map', () => {
      component.countryMap = { 'US': 'United States', 'FR': 'France' };
      expect(component.getCountryName('US')).toBe('United States');
    });

    it('should fallback to common countries when not in map', () => {
      component.countryMap = {};
      expect(component.getCountryName('JP')).toBe('Japan');
    });

    it('should return country code when not found anywhere', () => {
      component.countryMap = {};
      expect(component.getCountryName('XX')).toBe('XX');
    });
  });

  describe('watchlist toggle', () => {
    it('labels the button "Notify when available" when not yet available', () => {
      component.isAvailableInFrance = false;
      expect(component.watchlistButtonLabel).toBe('Notify when available');
      expect(component.watchlistButtonIcon).toBe('notifications_active');
    });

    it('labels the button "Add to Watchlist" when available', () => {
      component.isAvailableInFrance = true;
      expect(component.watchlistButtonLabel).toBe('Add to Watchlist');
      expect(component.watchlistButtonIcon).toBe('bookmark_add');
    });

    it('toggleWatchlist adds the current item then removes it', () => {
      component.movie = { ...mockMovie } as any;
      component.contentType = 'movie';

      component.toggleWatchlist();
      expect(component.isInWatchlist).toBeTrue();
      expect(component.watchlistButtonLabel).toBe('In Watchlist');

      component.toggleWatchlist();
      expect(component.isInWatchlist).toBeFalse();
    });
  });

  describe('findAvailableCountries', () => {
    it('should find countries where selected platforms are available', () => {
      component.selectedPlatforms = [8]; // Netflix
      component.watchProviders = mockWatchProviders.results as any;
      component.countryMap = { 'US': 'United States', 'FR': 'France' };
      component.findAvailableCountries();

      expect(component.availableCountries.length).toBeGreaterThan(0);
    });

    it('should return empty when no watch providers', () => {
      component.watchProviders = null;
      component.findAvailableCountries();

      expect(component.availableCountries.length).toBe(0);
    });

    it('keeps non-France European matches (regression: SM/VA were dropped)', () => {
      component.selectedPlatforms = [119]; // Prime Video
      component.watchProviders = {
        SM: { flatrate: [{ provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/p.jpg' }] },
        VA: { flatrate: [{ provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/p.jpg' }] }
      } as any;
      component.countryMap = { SM: 'San Marino', VA: 'Vatican City' };
      component.findAvailableCountries();

      const codes = component.availableCountries.map(c => c.countryCode).sort();
      expect(codes).toEqual(['SM', 'VA']);
    });

    it('pins France first and drops EU-locked (DE), keeping non-EU (US)', () => {
      component.selectedPlatforms = [8];
      component.watchProviders = {
        US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' }] },
        FR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' }] },
        DE: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' }] }
      } as any;
      component.countryMap = { US: 'United States', FR: 'France', DE: 'Germany' };
      component.findAvailableCountries();

      const codes = component.availableCountries.map(c => c.countryCode);
      expect(codes[0]).toBe('FR');         // France pinned first
      expect(codes).toContain('US');        // non-EU kept
      expect(codes).not.toContain('DE');    // EU-non-France dropped
      expect(component.lockedCountryCount).toBe(1); // DE counted as locked
    });
  });
});
