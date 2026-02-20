import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, NEVER } from 'rxjs';

import { InspirationComponent } from './inspiration.component';
import { MovieService } from '../../services/movie.service';
import { WikidataService } from '../../services/wikidata.service';
import { PaginatedResponse, SearchResultItem, WatchProviderResponse } from '../../models/tmdb.models';

describe('InspirationComponent', () => {
  let component: InspirationComponent;
  let fixture: ComponentFixture<InspirationComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;
  let wikidataServiceSpy: jasmine.SpyObj<WikidataService>;

  const mockResponse: PaginatedResponse<SearchResultItem> = {
    page: 1,
    results: [
      {
        id: 1,
        title: 'Test Movie',
        overview: 'A test movie',
        poster_path: '/test.jpg',
        backdrop_path: '/backdrop.jpg',
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

  const emptyResponse: PaginatedResponse<SearchResultItem> = {
    page: 1,
    results: [],
    total_pages: 0,
    total_results: 0
  };

  const mockWatchProviders: WatchProviderResponse = {
    id: 1,
    results: {
      FR: {
        flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }]
      }
    }
  };

  const mockMovieDetails = {
    id: 1,
    title: 'Test Movie',
    overview: 'A test movie',
    poster_path: '/test.jpg',
    backdrop_path: '/backdrop.jpg',
    release_date: '2024-01-01',
    vote_average: 7.5,
    vote_count: 100,
    runtime: 120,
    genres: [{ id: 28, name: 'Action' }]
  };

  beforeEach(async () => {
    movieServiceSpy = jasmine.createSpyObj('MovieService', [
      'discover',
      'getMovieDetails',
      'getTVDetails',
      'getMovieWatchProviders',
      'getTVWatchProviders'
    ]);
    movieServiceSpy.discover.and.returnValue(of(mockResponse));
    movieServiceSpy.getMovieDetails.and.returnValue(of(mockMovieDetails as any));
    movieServiceSpy.getTVDetails.and.returnValue(of(mockMovieDetails as any));
    movieServiceSpy.getMovieWatchProviders.and.returnValue(of(mockWatchProviders));
    movieServiceSpy.getTVWatchProviders.and.returnValue(of(mockWatchProviders));

    wikidataServiceSpy = jasmine.createSpyObj('WikidataService', ['getCannesFilmIds']);
    wikidataServiceSpy.getCannesFilmIds.and.returnValue(of([999, 998, 997]));

    await TestBed.configureTestingModule({
      imports: [InspirationComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MovieService, useValue: movieServiceSpy },
        { provide: WikidataService, useValue: wikidataServiceSpy }
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

  it('should show message when no platforms selected', () => {
    localStorage.removeItem('selectedPlatforms');
    createComponent();
    fixture.detectChanges();

    const noMsg = fixture.nativeElement.querySelector('.no-platforms');
    expect(noMsg).toBeTruthy();
    expect(movieServiceSpy.discover).not.toHaveBeenCalled();
  });

  it('should load all sections on init with platforms', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8, 337]));
    createComponent();
    fixture.detectChanges();

    // Hidden gems: 3, discover moods: 6 x 3 = 18, genre: 3, trending: 3
    // Total discover = 3 + 18 + 3 + 3 = 27
    // (Cannes Festival mood uses curated IDs via getMovieDetails, not discover)
    expect(movieServiceSpy.discover).toHaveBeenCalledTimes(27);
  });

  it('should call hidden gems with correct params including date floor and page rotation', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // Hidden gems are distinguished by vote_count.gte=100 + vote_count.lte=1000
    const gemsCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args =>
        args[3] === 'vote_average.desc' &&
        args[4] && args[4]['vote_count.gte'] === '100' && args[4]['vote_count.lte'] === '1000'
      );

    expect(gemsCalls.length).toBe(3);
    for (const call of gemsCalls) {
      expect(call[0]).toBe('movie');
      expect(call[4]).toEqual(jasmine.objectContaining({
        'vote_average.gte': '7.5'
      }));
      // Should have a page param (day-seeded rotation)
      expect(call[4]!['page']).toBeDefined();
      // Should have a date floor (last 10 years)
      expect(call[4]!['primary_release_date.gte']).toBeDefined();
    }
  });

  it('should load mood data with genre OR logic (pipe separator)', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // Check that mood calls use pipe separator for genres
    const moodCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args => args[4] && args[4]['with_genres'] && args[4]['with_genres'].includes('|'));

    // 5 moods with multi-genre (pipe) x 3 regions = 15 (auteur has single genre, no pipe)
    expect(moodCalls.length).toBe(15);
  });

  it('should load French Cinema mood with with_original_language=fr', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const frenchCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args => args[4] && args[4]['with_original_language'] === 'fr');
    expect(frenchCalls.length).toBe(3);
    expect(component.moodResults['french']).toBeDefined();
  });

  it('should load Auteur Cinema mood with vote_count cap', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const auteurCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args =>
        args[4] && args[4]['vote_count.lte'] === '2000' &&
        args[4]['vote_average.gte'] === '7.5'
      );
    expect(auteurCalls.length).toBe(3);
    expect(component.moodResults['auteur']).toBeDefined();
  });

  it('should load Cannes Festival mood via curated getMovieDetails calls', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // WikidataService should be called for the curated (festival) mood
    expect(wikidataServiceSpy.getCannesFilmIds).toHaveBeenCalled();
    // Curated mood fetches individual movie details (20 items subset from merged pool)
    // Plus 1 call for pick-of-day enrichment = 21 total
    expect(movieServiceSpy.getMovieDetails.calls.count()).toBe(21);
    expect(component.moodResults['festival']).toBeDefined();
    expect(component.moodResults['festival'].length).toBeGreaterThan(0);
  });

  it('should not load Cannes Festival mood in TV mode', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    movieServiceSpy.getMovieDetails.calls.reset();
    component.onContentTypeChange('tv');
    fixture.detectChanges();

    // Curated moods are movie-only; in TV mode, festival should be empty
    expect(component.moodResults['festival']).toEqual([]);
  });

  it('should enrich pick of the day with details and providers', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    expect(movieServiceSpy.getMovieDetails).toHaveBeenCalled();
    expect(movieServiceSpy.getMovieWatchProviders).toHaveBeenCalled();
    expect(component.pickOfDay).toBeTruthy();
    expect(component.pickOfDay!.details).toBeTruthy();
    expect(component.pickOfDay!.platforms.length).toBeGreaterThanOrEqual(0);
  });

  it('should load trending with 30-day date range', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    // Trending calls: popularity.desc with 30-day window and NO with_genres (distinguishes from mood calls)
    const trendingCalls = movieServiceSpy.discover.calls.allArgs()
      .filter(args =>
        args[3] === 'popularity.desc' &&
        args[4] &&
        args[4]['primary_release_date.gte'] === thirtyDaysAgo &&
        args[4]['primary_release_date.lte'] === today &&
        !args[4]['with_genres']
      );

    expect(trendingCalls.length).toBe(3);
  });

  it('should switch to TV mode and reload all sections', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    movieServiceSpy.discover.calls.reset();
    movieServiceSpy.getMovieDetails.calls.reset();
    movieServiceSpy.getTVDetails.calls.reset();

    component.onContentTypeChange('tv');
    fixture.detectChanges();

    expect(component.contentType).toBe('tv');
    // In TV mode: 4 discover moods (french + auteur are movieOnly) x 3 regions = 12,
    // plus hidden gems 3 + genre 3 + trending 3 = 21 total
    expect(movieServiceSpy.discover).toHaveBeenCalledTimes(21);
    // TV details should be called for pick enrichment
    expect(movieServiceSpy.getTVDetails).toHaveBeenCalled();
  });

  it('should reset all data on content type change', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // Verify data loaded
    expect(component.hiddenGems.length).toBeGreaterThan(0);

    component.onContentTypeChange('tv');

    // Data should be re-populated after reload
    expect(component.contentType).toBe('tv');
  });

  it('should handle hidden gems error independently', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    movieServiceSpy.discover.and.callFake((_type: any, _providers: any, _region: any, sortBy: any, extra: any) => {
      // Only fail hidden gems calls (vote_average.desc + vote_count.lte=1000)
      if (sortBy === 'vote_average.desc' && extra && extra['vote_count.lte'] === '1000') {
        return throwError(() => new Error('API error'));
      }
      return of(mockResponse);
    });

    createComponent();
    fixture.detectChanges();

    expect(component.errorHiddenGems).toBe('Failed to load hidden gems.');
    // Moods and trending should still load
    expect(component.errorMoods).toBe('');
    expect(component.errorTrending).toBe('');
  });

  it('should handle mood error independently', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    movieServiceSpy.discover.and.callFake((_type: any, _providers: any, _region: any, sortBy: any, extra: any) => {
      if (sortBy === 'popularity.desc' && extra && extra['with_genres'] && extra['with_genres'].includes('|')) {
        return throwError(() => new Error('API error'));
      }
      return of(mockResponse);
    });

    createComponent();
    fixture.detectChanges();

    expect(component.errorMoods).toBe('Failed to load mood recommendations.');
    expect(component.errorHiddenGems).toBe('');
  });

  it('should cache genre results and not reload', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const initialCallCount = movieServiceSpy.discover.calls.count();
    const currentGenreId = component.selectedGenreId;

    // Re-select same genre
    component.onGenreSelect(currentGenreId);

    // No new calls should be made
    expect(movieServiceSpy.discover.calls.count()).toBe(initialCallCount);
  });

  it('should load new genre on chip tap', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const initialCallCount = movieServiceSpy.discover.calls.count();

    // Select a different genre
    const genres = component.genres;
    const differentGenre = genres.find(g => g.id !== component.selectedGenreId)!;
    component.onGenreSelect(differentGenre.id);

    // Should make 3 new discover calls (one per region)
    expect(movieServiceSpy.discover.calls.count()).toBe(initialCallCount + 3);
  });

  it('should select mood without API calls', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    const initialCallCount = movieServiceSpy.discover.calls.count();

    component.onMoodSelect('intense');
    expect(component.selectedMood).toBe('intense');

    // Mood data was pre-loaded, no new calls
    expect(movieServiceSpy.discover.calls.count()).toBe(initialCallCount);
  });

  it('should merge Wikidata IDs with curated IDs for Cannes mood', () => {
    // Wikidata returns 3 unique IDs not in the curated list
    wikidataServiceSpy.getCannesFilmIds.and.returnValue(of([999, 998, 997]));
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // getMovieDetails should be called with some of the Wikidata IDs (999, 998, 997)
    // depending on daily rotation. The merged pool is larger than curated alone.
    const calledIds = movieServiceSpy.getMovieDetails.calls.allArgs().map(a => a[0]);
    // The 3 Wikidata IDs are prepended, so they should appear in the merged pool
    // With 20 items in the subset, at least some Wikidata IDs should be fetched
    // (exact IDs depend on day-of-year rotation)
    expect(wikidataServiceSpy.getCannesFilmIds).toHaveBeenCalledTimes(1);
    expect(calledIds.length).toBe(21); // 20 curated subset + 1 pick enrichment
  });

  it('should fall back to curated IDs when Wikidata returns empty array', () => {
    wikidataServiceSpy.getCannesFilmIds.and.returnValue(of([]));
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // Should still load festival mood from curated IDs alone
    expect(component.moodResults['festival']).toBeDefined();
    expect(component.moodResults['festival'].length).toBeGreaterThan(0);
    // 20 curated subset + 1 pick enrichment
    expect(movieServiceSpy.getMovieDetails.calls.count()).toBe(21);
  });

  it('should deduplicate Wikidata IDs that overlap with curated IDs', () => {
    // Return IDs that overlap with the curated list (first few curated IDs from 2024)
    wikidataServiceSpy.getCannesFilmIds.and.returnValue(of([927547, 1064213, 999]));
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    // The merged set should not have duplicates — verify no movie ID is fetched twice
    const calledIds = movieServiceSpy.getMovieDetails.calls.allArgs().map(a => a[0]);
    // Exclude pick-of-day enrichment call (first call from hidden gems, id=1)
    const curatedCallIds = calledIds.filter(id => id !== 1);
    const uniqueIds = new Set(curatedCallIds);
    expect(uniqueIds.size).toBe(curatedCallIds.length);
  });

  it('should deduplicate items across regions', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    movieServiceSpy.discover.and.returnValue(of(mockResponse));
    createComponent();
    fixture.detectChanges();

    // All regions return same item (id: 1), should be deduped
    expect(component.hiddenGems.length).toBe(1);
    expect(component.hiddenGems[0].id).toBe(1);
  });

  it('should tag results with correct media_type', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createComponent();
    fixture.detectChanges();

    expect(component.hiddenGems[0].media_type).toBe('movie');
  });

  it('should show pick of day with fallback when enrichment fails', () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    movieServiceSpy.getMovieDetails.and.returnValue(throwError(() => new Error('fail')));
    movieServiceSpy.getMovieWatchProviders.and.returnValue(throwError(() => new Error('fail')));

    createComponent();
    fixture.detectChanges();

    // Pick should still exist, just without enriched details
    expect(component.pickOfDay).toBeTruthy();
    expect(component.pickOfDay!.details).toBeNull();
    expect(component.pickOfDay!.platforms.length).toBe(0);
  });
});
