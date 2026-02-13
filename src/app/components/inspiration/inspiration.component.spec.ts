import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, NEVER } from 'rxjs';

import { InspirationComponent } from './inspiration.component';
import { MovieService } from '../../services/movie.service';
import { PaginatedResponse, SearchResultItem } from '../../models/tmdb.models';

describe('InspirationComponent', () => {
  let component: InspirationComponent;
  let fixture: ComponentFixture<InspirationComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;

  const mockResponse: PaginatedResponse<SearchResultItem> = {
    page: 1,
    results: [
      {
        id: 1,
        title: 'Test Movie',
        overview: 'A test movie',
        poster_path: '/test.jpg',
        backdrop_path: null,
        release_date: '2024-01-01',
        vote_average: 7.5,
        vote_count: 100,
        genre_ids: [28],
        media_type: 'movie'
      } as SearchResultItem
    ],
    total_pages: 1,
    total_results: 1
  };

  const mockResponse2: PaginatedResponse<SearchResultItem> = {
    page: 1,
    results: [
      {
        id: 2,
        title: 'Test Movie 2',
        overview: 'Another test movie',
        poster_path: '/test2.jpg',
        backdrop_path: null,
        release_date: '2024-02-01',
        vote_average: 8.0,
        vote_count: 200,
        genre_ids: [18],
        media_type: 'movie'
      } as SearchResultItem
    ],
    total_pages: 1,
    total_results: 1
  };

  beforeEach(async () => {
    movieServiceSpy = jasmine.createSpyObj('MovieService', [
      'discover',
      'getMovieWatchProviders',
      'getTVWatchProviders'
    ]);
    movieServiceSpy.discover.and.returnValue(of(mockResponse));
    movieServiceSpy.getMovieWatchProviders.and.returnValue(of({ id: 1, results: {} }));
    movieServiceSpy.getTVWatchProviders.and.returnValue(of({ id: 1, results: {} }));

    await TestBed.configureTestingModule({
      imports: [InspirationComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MovieService, useValue: movieServiceSpy }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('selectedPlatforms');
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(InspirationComponent);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    createComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load movie data on init by default', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8, 337]));
    createComponent();
    fixture.detectChanges();

    expect(component.contentType).toBe('movie');
    // 6 calls: 3 regions × 2 categories (popular + recent)
    expect(movieServiceSpy.discover).toHaveBeenCalledTimes(6);
    expect(movieServiceSpy.discover).toHaveBeenCalledWith('movie', [8, 337], 'FR', 'popularity.desc');
    expect(movieServiceSpy.discover).toHaveBeenCalledWith('movie', [8, 337], 'CA', 'popularity.desc');
    expect(movieServiceSpy.discover).toHaveBeenCalledWith('movie', [8, 337], 'US', 'popularity.desc');
  });

  it('should pass date window for recent calls (popularity + date range)', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      .toISOString().split('T')[0];

    // Recent calls use popularity.desc with date range, so all 6 calls use popularity.desc
    // but 3 of them have the date range extra params
    const recentCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args => args[4] && args[4]['primary_release_date.gte']);

    expect(recentCalls.length).toBe(3);
    for (const call of recentCalls) {
      expect(call[3]).toBe('popularity.desc');
      expect(call[4]).toEqual({
        'primary_release_date.gte': monthsAgo,
        'primary_release_date.lte': today
      });
    }
  });

  it('should switch to TV data when toggle changes', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    movieServiceSpy.discover.calls.reset();
    component.onContentTypeChange('tv');
    fixture.detectChanges();

    expect(component.contentType).toBe('tv');
    expect(movieServiceSpy.discover).toHaveBeenCalledWith('tv', [8], 'FR', 'popularity.desc');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      .toISOString().split('T')[0];

    // Recent TV calls use popularity.desc with date window
    const recentCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args => args[4] && args[4]['first_air_date.gte']);

    expect(recentCalls.length).toBe(3);
    for (const call of recentCalls) {
      expect(call[3]).toBe('popularity.desc');
      expect(call[4]).toEqual({
        'first_air_date.gte': monthsAgo,
        'first_air_date.lte': today
      });
    }
  });

  it('should show loading spinner while loading', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    movieServiceSpy.discover.and.returnValue(NEVER);
    createComponent();
    fixture.detectChanges();

    expect(component.loading).toBeTrue();
    const spinner = fixture.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should handle API errors', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    movieServiceSpy.discover.and.returnValue(throwError(() => new Error('API error')));
    createComponent();
    fixture.detectChanges();

    expect(component.error).toBe('Failed to load content. Please try again.');
    expect(component.loading).toBeFalse();
  });

  it('should show 2 carousel sections (no country sections)', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const carouselSections = fixture.nativeElement.querySelectorAll('.carousel-section');
    expect(carouselSections.length).toBe(2);

    const countrySections = fixture.nativeElement.querySelectorAll('.country-section');
    expect(countrySections.length).toBe(0);
  });

  it('should render "See More" links', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const seeMoreLinks = fixture.nativeElement.querySelectorAll('.see-more-link');
    expect(seeMoreLinks.length).toBe(2);
  });

  it('should show message when no platforms selected', () => {
    localStorage.removeItem('selectedPlatforms');
    createComponent();
    fixture.detectChanges();

    const noMsg = fixture.nativeElement.querySelector('.no-platforms');
    expect(noMsg).toBeTruthy();
    expect(movieServiceSpy.discover).not.toHaveBeenCalled();
  });

  it('should tag results with the correct media_type', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    expect(component.popularItems.length).toBeGreaterThan(0);
    expect(component.popularItems[0].media_type).toBe('movie');
  });

  it('should deduplicate items across regions', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    // All 3 regions return the same item (id: 1)
    movieServiceSpy.discover.and.returnValue(of(mockResponse));
    createComponent();
    fixture.detectChanges();

    // Should have exactly 1 item despite 3 regions returning the same ID
    expect(component.popularItems.length).toBe(1);
    expect(component.popularItems[0].id).toBe(1);
  });

  it('should merge unique items from different regions', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    // Return different items per region
    let callIndex = 0;
    movieServiceSpy.discover.and.callFake(() => {
      callIndex++;
      // popular_FR (call 1) and recent_FR (call 2) return mockResponse (id: 1)
      // popular_CA (call 3) and recent_CA (call 4) return mockResponse2 (id: 2)
      // popular_US (call 5) and recent_US (call 6) return mockResponse (id: 1)
      if (callIndex === 3 || callIndex === 4) {
        return of(mockResponse2);
      }
      return of(mockResponse);
    });
    createComponent();
    fixture.detectChanges();

    // Popular: FR has id=1, CA has id=2, US has id=1 → merged = [1, 2]
    expect(component.popularItems.length).toBe(2);
  });
});
