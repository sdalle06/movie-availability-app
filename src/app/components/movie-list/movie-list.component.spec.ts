import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MovieListComponent } from './movie-list.component';
import { MovieService } from '../../services/movie.service';
import { SearchComponent } from '../search/search.component';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { PlatformSelectorComponent } from '../platform-selector/platform-selector.component';

// Mock components
@Component({ selector: 'app-search', template: '', standalone: true })
class MockSearchComponent {
  @Input() initialQuery = '';
  @Input() initialContentType = 'multi';
  @Output() search = new EventEmitter<{query: string, contentType: string}>();
}

@Component({ selector: 'app-movie-card', template: '', standalone: true })
class MockMovieCardComponent {
  @Input() movie: any = {};
  @Input() selectedPlatforms: number[] = [];
}

@Component({ selector: 'app-platform-selector', template: '', standalone: true })
class MockPlatformSelectorComponent {
  @Input() selectedPlatforms: number[] = [];
  @Output() platformsChange = new EventEmitter<number[]>();
}

describe('MovieListComponent', () => {
  let component: MovieListComponent;
  let fixture: ComponentFixture<MovieListComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockMovies = {
    page: 1,
    results: [
      { id: 1, title: 'Test Movie 1', poster_path: '/path1.jpg', overview: 'Overview 1', media_type: 'movie' as const },
      { id: 2, title: 'Test Movie 2', poster_path: '/path2.jpg', overview: 'Overview 2', media_type: 'movie' as const },
      { id: 3, title: 'Test Movie 3', poster_path: '/path3.jpg', overview: 'Overview 3', media_type: 'movie' as const }
    ],
    total_pages: 1,
    total_results: 3
  };

  beforeEach(async () => {
    const movieSpy = jasmine.createSpyObj('MovieService', [
      'searchMovies',
      'searchTVShows',
      'searchMulti',
      'getWatchProvidersByRegion',
      'getMovieDetails',
      'getMovieWatchProviders',
      'getCountries'
    ]);

    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpyObj = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        MovieListComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatButtonModule,
        MatIconModule
      ],
      providers: [
        { provide: MovieService, useValue: movieSpy },
        { provide: Router, useValue: routerSpyObj },
        { provide: MatSnackBar, useValue: snackBarSpyObj }
      ]
    })
    .overrideComponent(MovieListComponent, {
      remove: { imports: [SearchComponent, MovieCardComponent, PlatformSelectorComponent] },
      add: { imports: [MockSearchComponent, MockMovieCardComponent, MockPlatformSelectorComponent] }
    })
    .compileComponents();

    movieServiceSpy = TestBed.inject(MovieService) as jasmine.SpyObj<MovieService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    spyOn(localStorage, 'setItem');
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    spyOn(sessionStorage, 'setItem');
    spyOn(sessionStorage, 'removeItem');

    fixture = TestBed.createComponent(MovieListComponent);
    component = fixture.componentInstance;

    // Spy on the actual snackBar instance used by the component
    snackBarSpy = (component as any).snackBar;
    spyOn(snackBarSpy, 'open');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSearch', () => {
    it('should search for movies and update the movies array on success', () => {
      movieServiceSpy.searchMovies.and.returnValue(of(mockMovies as any));

      component.onSearch({query: 'test movie', contentType: 'movie'});

      expect(movieServiceSpy.searchMovies).toHaveBeenCalledWith('test movie');
      expect(component.loading).toBeFalse();
      expect(component.searchPerformed).toBeTrue();
      expect(component.lastSearchQuery).toBe('test movie');
      expect(component.movies.length).toBe(3);
    });

    it('should search TV shows when contentType is tv', () => {
      movieServiceSpy.searchTVShows.and.returnValue(of({ page: 1, results: [], total_pages: 0, total_results: 0 } as any));

      component.onSearch({query: 'breaking bad', contentType: 'tv'});

      expect(movieServiceSpy.searchTVShows).toHaveBeenCalledWith('breaking bad');
    });

    it('should use searchMulti when contentType is multi', () => {
      movieServiceSpy.searchMulti.and.returnValue(of(mockMovies as any));

      component.onSearch({query: 'test', contentType: 'multi'});

      expect(movieServiceSpy.searchMulti).toHaveBeenCalledWith('test');
    });

    it('should not search if query is empty or only whitespace', () => {
      component.onSearch({query: '', contentType: 'movie'});
      component.onSearch({query: '   ', contentType: 'movie'});

      expect(movieServiceSpy.searchMovies).not.toHaveBeenCalled();
    });

    it('should show snackbar when no results found', () => {
      const emptyResults = { page: 1, results: [], total_pages: 0, total_results: 0 };
      movieServiceSpy.searchMovies.and.returnValue(of(emptyResults as any));

      component.onSearch({query: 'no results', contentType: 'movie'});

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'No movies found. Try a different search term.',
        'Close',
        jasmine.objectContaining({ duration: 3000 })
      );
    });

    it('should handle errors when searching', () => {
      const testError = new Error('Test error');
      movieServiceSpy.searchMovies.and.returnValue(throwError(() => testError));

      component.onSearch({query: 'test', contentType: 'movie'});

      expect(component.loading).toBeFalse();
      expect(component.movies).toEqual([]);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Error searching. Please try again.',
        'Close',
        jasmine.objectContaining({ duration: 3000 })
      );
    });
  });

  describe('search history', () => {
    it('records a search in history when results are found', () => {
      movieServiceSpy.searchMovies.and.returnValue(of(mockMovies as any));

      component.onSearch({ query: 'dune', contentType: 'movie' });

      const recent = component.recentSearches();
      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0].query).toBe('dune');
      expect(recent[0].contentType).toBe('movie');
    });

    it('does not record a search when no results are found', () => {
      const before = component.recentSearches().length;
      movieServiceSpy.searchMovies.and.returnValue(
        of({ page: 1, results: [], total_pages: 0, total_results: 0 } as any)
      );

      component.onSearch({ query: 'nothing', contentType: 'movie' });

      expect(component.recentSearches().length).toBe(before);
    });

    it('rerunSearch re-issues the search for a history entry', () => {
      movieServiceSpy.searchMulti.and.returnValue(of(mockMovies as any));

      component.rerunSearch({ query: 'matrix', contentType: 'multi', at: 1 });

      expect(component.lastSearchQuery).toBe('matrix');
      expect(movieServiceSpy.searchMulti).toHaveBeenCalledWith('matrix');
    });

    it('clearHistory empties the recent searches', () => {
      movieServiceSpy.searchMulti.and.returnValue(of(mockMovies as any));
      component.onSearch({ query: 'matrix', contentType: 'multi' });
      expect(component.recentSearches().length).toBeGreaterThan(0);

      component.clearHistory();

      expect(component.recentSearches().length).toBe(0);
    });
  });

  describe('onSelectMovie', () => {
    it('should navigate to movie details page when a movie is selected', () => {
      component.onSelectMovie(123);

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/movies', 123]);
    });
  });

  describe('onPlatformsChange', () => {
    it('should update selected platforms and save to localStorage', () => {
      const platforms = [8, 9, 337];

      component.onPlatformsChange(platforms);

      expect(component.selectedPlatforms).toEqual(platforms);
      expect(localStorage.setItem).toHaveBeenCalledWith('selectedPlatforms', JSON.stringify(platforms));
    });
  });

  describe('resetSearch', () => {
    it('should reset search state', () => {
      component.movies = mockMovies.results as any;
      component.searchPerformed = true;
      component.lastSearchQuery = 'test';

      component.resetSearch();

      expect(component.movies).toEqual([]);
      expect(component.searchPerformed).toBeFalse();
      expect(component.lastSearchQuery).toBe('');
    });
  });
});
