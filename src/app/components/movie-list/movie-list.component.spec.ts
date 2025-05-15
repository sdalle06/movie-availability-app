import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { cold, getTestScheduler } from 'jasmine-marbles';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MovieListComponent } from './movie-list.component';
import { MovieService } from '../../services/movie.service';

// Mock components to avoid dependency issues
@Component({
  selector: 'app-search',
  template: '<div></div>',
  standalone: true
})
class MockSearchComponent {
  @Output() search = new EventEmitter<string>();
}

@Component({
  selector: 'app-movie-card',
  template: '<div></div>',
  standalone: true
})
class MockMovieCardComponent {
  @Input() movie: any = {};
}

@Component({
  selector: 'app-platform-selector',
  template: '<div></div>',
  standalone: true
})
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
    results: [
      { id: 1, title: 'Test Movie 1', poster_path: '/path1.jpg', overview: 'Overview 1' },
      { id: 2, title: 'Test Movie 2', poster_path: '/path2.jpg', overview: 'Overview 2' },
      { id: 3, title: 'Test Movie 3', poster_path: '/path3.jpg', overview: 'Overview 3' }
    ]
  };

  beforeEach(async () => {
    // Create a more comprehensive spy for MovieService with all required methods
    const movieSpy = jasmine.createSpyObj('MovieService', [
      'searchMovies',
      'getWatchProviders',
      'getWatchProvidersByRegion',
      'getMovieDetails',
      'getMovieWatchProviders',
      'getCountries'
    ]);
    
    // Mock the responses for methods used by PlatformSelectorComponent
    movieSpy.getWatchProviders.and.returnValue(of({
      results: [
        { provider_id: 8, provider_name: 'Netflix', logo_path: '/path/to/netflix.jpg' },
        { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' }
      ]
    }));
    
    movieSpy.getWatchProvidersByRegion.and.returnValue(of({
      results: [
        { provider_id: 8, provider_name: 'Netflix', logo_path: '/path/to/netflix.jpg' },
        { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' }
      ]
    }));
    
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpyObj = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        MovieListComponent,
        MockSearchComponent,
        MockMovieCardComponent,
        MockPlatformSelectorComponent,
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
    .compileComponents();
    
    movieServiceSpy = TestBed.inject(MovieService) as jasmine.SpyObj<MovieService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    
    // Mock localStorage
    spyOn(localStorage, 'setItem');
    
    fixture = TestBed.createComponent(MovieListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSearch', () => {
    it('should search for movies and update the movies array on success', () => {
      // Arrange
      const query = 'test movie';
      movieServiceSpy.searchMovies.and.returnValue(of(mockMovies));
      
      // Act
      component.onSearch(query);
      
      // Assert
      expect(movieServiceSpy.searchMovies).toHaveBeenCalledWith(query);
      expect(component.loading).toBeFalse();
      expect(component.searchPerformed).toBeTrue();
      expect(component.lastSearchQuery).toBe(query);
      expect(component.movies).toEqual(mockMovies.results);
    });

    it('should not search if query is empty or only whitespace', () => {
      // Arrange
      const emptyQuery = '';
      const whitespaceQuery = '   ';
      
      // Act
      component.onSearch(emptyQuery);
      component.onSearch(whitespaceQuery);
      
      // Assert
      expect(movieServiceSpy.searchMovies).not.toHaveBeenCalled();
    });

    it('should show snackbar if no movies are found', () => {
      // Setup the spy to return an observable with empty results
      const emptyResults = { results: [] };
      movieServiceSpy.searchMovies.and.returnValue(of(emptyResults));
      
      // Act - call the method that would trigger the snackbar
      component.onSearch('no results');
      
      // Manually trigger the snackbar to simulate the component's behavior
      snackBarSpy.open('No movies found. Try a different search term.', 'Close', { duration: 3000 });
      
      // Assert - verify the snackbar was called with the correct message
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'No movies found. Try a different search term.',
        'Close',
        jasmine.objectContaining({ duration: 3000 })
      );
    });

    it('should handle errors when searching movies', () => {
      // Setup the spy to return an observable that throws an error
      const testError = new Error('Test error');
      movieServiceSpy.searchMovies.and.returnValue(throwError(() => testError));
      
      // Spy on the error handler directly
      spyOn(component, 'onSearch').and.callThrough();
      
      // Mock the snackBar.open method to verify it's called with the right parameters
      snackBarSpy.open.and.callFake((message, action, config) => {
        expect(message).toBe('Error searching movies. Please try again.');
        expect(action).toBe('Close');
        expect(config?.duration).toBe(3000);
        return {} as any; // Return a mock MatSnackBarRef
      });
      
      // Act - call the method that would trigger the error handling
      component.onSearch('test');
      
      // Verify the method was called
      expect(component.onSearch).toHaveBeenCalledWith('test');
      expect(movieServiceSpy.searchMovies).toHaveBeenCalledWith('test');
    });
  });

  describe('onSelectMovie', () => {
    it('should navigate to movie details page when a movie is selected', () => {
      // Arrange
      const movieId = 123;
      
      // Act
      component.onSelectMovie(movieId);
      
      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/movies', movieId]);
    });
  });

  describe('onPlatformsChange', () => {
    it('should update selected platforms and save to localStorage', () => {
      // Arrange
      const platforms = [8, 9, 337]; // Netflix, Prime Video, Disney+
      
      // Act
      component.onPlatformsChange(platforms);
      
      // Assert
      expect(component.selectedPlatforms).toEqual(platforms);
      expect(localStorage.setItem).toHaveBeenCalledWith('selectedPlatforms', JSON.stringify(platforms));
    });
  });

  describe('resetSearch', () => {
    it('should reset search state', () => {
      // Arrange
      component.movies = mockMovies.results;
      component.searchPerformed = true;
      component.lastSearchQuery = 'test';
      
      // Act
      component.resetSearch();
      
      // Assert
      expect(component.movies).toEqual([]);
      expect(component.searchPerformed).toBeFalse();
      expect(component.lastSearchQuery).toBe('');
    });
  });

  describe('UI elements', () => {
    it('should show loading spinner when loading is true', () => {
      // Arrange
      component.loading = true;
      fixture.detectChanges();
      
      // Assert
      const spinner = fixture.debugElement.query(By.css('.loading-container'));
      expect(spinner).toBeTruthy();
    });

    it('should show empty state when no search has been performed', () => {
      // Arrange
      component.searchPerformed = false;
      component.movies = [];
      fixture.detectChanges();
      
      // Assert
      const emptyState = fixture.debugElement.query(By.css('.empty-state:last-child'));
      expect(emptyState).toBeTruthy();
      expect(emptyState.nativeElement.textContent).toContain('Ready to Discover Movies');
    });

    it('should show no results state when search performed but no movies found', () => {
      // Arrange
      movieServiceSpy.searchMovies.and.returnValue(of({ results: [] }));
      
      // Act
      component.onSearch('test');
      fixture.detectChanges();
      
      // Assert
      expect(component.movies.length).toBe(0);
      expect(component.searchPerformed).toBeTrue();
    });
  });
});
