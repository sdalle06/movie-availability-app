import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

import { BrowseComponent } from './browse.component';
import { MovieService } from '../../services/movie.service';
import { PaginatedResponse, SearchResultItem } from '../../models/tmdb.models';

describe('BrowseComponent', () => {
  let component: BrowseComponent;
  let fixture: ComponentFixture<BrowseComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;
  let queryParamsSubject: Subject<Record<string, string>>;

  const createMockResponse = (ids: number[], totalPages = 1): PaginatedResponse<SearchResultItem> => ({
    page: 1,
    results: ids.map(id => ({
      id,
      title: `Movie ${id}`,
      overview: `Overview ${id}`,
      poster_path: `/poster${id}.jpg`,
      backdrop_path: null,
      release_date: '2024-01-01',
      vote_average: 7.5,
      vote_count: 100,
      genre_ids: [28],
      media_type: 'movie' as const
    })) as SearchResultItem[],
    total_pages: totalPages,
    total_results: ids.length
  });

  beforeEach(async () => {
    queryParamsSubject = new Subject();
    movieServiceSpy = jasmine.createSpyObj('MovieService', [
      'discover',
      'getMovieWatchProviders',
      'getTVWatchProviders'
    ]);
    movieServiceSpy.discover.and.returnValue(of(createMockResponse([1, 2, 3])));
    movieServiceSpy.getMovieWatchProviders.and.returnValue(of({ id: 1, results: {} }));
    movieServiceSpy.getTVWatchProviders.and.returnValue(of({ id: 1, results: {} }));

    await TestBed.configureTestingModule({
      imports: [BrowseComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MovieService, useValue: movieServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParamsSubject.asObservable() }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('selectedPlatforms');
  });

  function createComponent(platforms: number[] = [8, 337]): void {
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms));
    fixture = TestBed.createComponent(BrowseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should read query params for sort and type', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'tv' });
    fixture.detectChanges();

    expect(component.contentType).toBe('tv');
    expect(component.sortBy).toBe('popularity.desc');
  });

  it('should call discover for 3 regions and merge results', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    // 3 calls (one per region)
    expect(movieServiceSpy.discover).toHaveBeenCalledTimes(3);
    // All 3 return same IDs, dedup should give us 3 unique items
    expect(component.items.length).toBe(3);
  });

  it('should deduplicate items across regions', () => {
    // FR returns [1,2], CA returns [2,3], US returns [3,4]
    let callIndex = 0;
    movieServiceSpy.discover.and.callFake(() => {
      callIndex++;
      if (callIndex === 1) return of(createMockResponse([1, 2]));
      if (callIndex === 2) return of(createMockResponse([2, 3]));
      return of(createMockResponse([3, 4]));
    });

    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    expect(component.items.length).toBe(4);
    const ids = component.items.map(i => i.id);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('should reload on sort change', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    movieServiceSpy.discover.calls.reset();
    component.onSortChange('vote_average.desc');
    fixture.detectChanges();

    expect(movieServiceSpy.discover).toHaveBeenCalledTimes(3);
    const sortArgs = movieServiceSpy.discover.calls.allArgs().map(a => a[3]);
    expect(sortArgs.every(s => s === 'vote_average.desc')).toBeTrue();
  });

  it('should pass vote_average.gte when rating filter is set', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    movieServiceSpy.discover.calls.reset();
    component.onRatingChange(7);
    fixture.detectChanges();

    const extraParams = movieServiceSpy.discover.calls.allArgs().map(a => a[4]);
    for (const params of extraParams) {
      expect(params?.['vote_average.gte']).toBe('7');
    }
  });

  it('should append results on Load More', () => {
    movieServiceSpy.discover.and.returnValue(of(createMockResponse([1, 2, 3], 3)));
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    expect(component.items.length).toBe(3);
    expect(component.hasMore).toBeTrue();

    // Load more with new items
    movieServiceSpy.discover.and.returnValue(of({
      page: 2,
      results: [
        { id: 4, title: 'Movie 4', overview: '', poster_path: null, backdrop_path: null, release_date: '2024-01-01', vote_average: 7, vote_count: 50, genre_ids: [], media_type: 'movie' as const },
        { id: 5, title: 'Movie 5', overview: '', poster_path: null, backdrop_path: null, release_date: '2024-01-01', vote_average: 7, vote_count: 50, genre_ids: [], media_type: 'movie' as const }
      ] as SearchResultItem[],
      total_pages: 3,
      total_results: 15
    }));

    component.loadMore();
    fixture.detectChanges();

    expect(component.currentPage).toBe(2);
    expect(component.items.length).toBe(5);
  });

  it('should show no-platforms message when no platforms selected', () => {
    localStorage.removeItem('selectedPlatforms');
    createComponent([]);
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    const noMsg = fixture.nativeElement.querySelector('.no-platforms');
    expect(noMsg).toBeTruthy();
    expect(movieServiceSpy.discover).not.toHaveBeenCalled();
  });

  it('should include date ceiling when sorting by date descending', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'primary_release_date.desc', type: 'movie' });
    fixture.detectChanges();

    const today = new Date().toISOString().split('T')[0];
    const extraParams = movieServiceSpy.discover.calls.allArgs().map(a => a[4]);
    for (const params of extraParams) {
      expect(params?.['primary_release_date.lte']).toBe(today);
    }
  });

  it('should derive correct page title', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();
    expect(component.pageTitle).toBe('Popular Movies');

    queryParamsSubject.next({ sort: 'popular_recent', type: 'movie' });
    fixture.detectChanges();
    expect(component.pageTitle).toBe('Popular & Recent Movies');

    queryParamsSubject.next({ sort: 'vote_average.desc', type: 'tv' });
    fixture.detectChanges();
    expect(component.pageTitle).toBe('Highest Rated TV Shows');
  });

  it('should apply date window for popular_recent sort', () => {
    createComponent();
    queryParamsSubject.next({ sort: 'popular_recent', type: 'movie' });
    fixture.detectChanges();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      .toISOString().split('T')[0];

    // API sort should be popularity.desc
    const sortArgs = movieServiceSpy.discover.calls.allArgs().map(a => a[3]);
    expect(sortArgs.every(s => s === 'popularity.desc')).toBeTrue();

    // Extra params should include date range
    const extraParams = movieServiceSpy.discover.calls.allArgs().map(a => a[4]);
    for (const params of extraParams) {
      expect(params?.['primary_release_date.gte']).toBe(monthsAgo);
      expect(params?.['primary_release_date.lte']).toBe(today);
    }
  });

  it('should handle API errors', () => {
    movieServiceSpy.discover.and.returnValue(throwError(() => new Error('API error')));
    createComponent();
    queryParamsSubject.next({ sort: 'popularity.desc', type: 'movie' });
    fixture.detectChanges();

    expect(component.error).toBe('Failed to load content. Please try again.');
    expect(component.loading).toBeFalse();
  });
});
