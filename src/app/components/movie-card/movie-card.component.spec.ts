import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';

import { MovieCardComponent } from './movie-card.component';
import { MovieService } from '../../services/movie.service';

describe('MovieCardComponent', () => {
  let component: MovieCardComponent;
  let fixture: ComponentFixture<MovieCardComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;

  const mockMovie = {
    id: 123,
    title: 'Test Movie',
    poster_path: '/test.jpg',
    overview: 'Test overview',
    vote_average: 8.5,
    release_date: '2023-01-01',
    media_type: 'movie' as const
  };

  beforeEach(async () => {
    movieServiceSpy = jasmine.createSpyObj('MovieService', [
      'getMovieWatchProviders',
      'getTVWatchProviders'
    ]);
    movieServiceSpy.getMovieWatchProviders.and.returnValue(of({
      id: 123,
      results: {
        FR: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }]
        }
      }
    } as any));

    await TestBed.configureTestingModule({
      imports: [
        MovieCardComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        { provide: MovieService, useValue: movieServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieCardComponent);
    component = fixture.componentInstance;

    component.movie = { ...mockMovie } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display movie title', () => {
    expect(component.contentTitle).toBe('Test Movie');
  });

  describe('getYear', () => {
    it('should return year from valid date', () => {
      expect(component.getYear('2023-01-01')).toBe('2023');
    });

    it('should return TBA for null date', () => {
      expect(component.getYear(null)).toBe('TBA');
    });

    it('should return TBA for empty date', () => {
      expect(component.getYear('')).toBe('TBA');
    });

    it('should return TBA for whitespace-only date', () => {
      expect(component.getYear('   ')).toBe('TBA');
    });
  });

  describe('getFullPosterPath', () => {
    it('should return full URL for valid poster path', () => {
      const result = component.getFullPosterPath('/test.jpg');
      expect(result).toContain('image.tmdb.org');
      expect(result).toContain('/test.jpg');
    });

    it('should return placeholder for null poster path', () => {
      const result = component.getFullPosterPath(null);
      expect(result).toContain('data:image/svg+xml');
    });
  });

  describe('isMovie / isTVShow', () => {
    it('should identify movie by media_type', () => {
      component.movie = { ...mockMovie, media_type: 'movie' } as any;
      expect(component.isMovie).toBeTrue();
      expect(component.isTVShow).toBeFalse();
    });

    it('should identify TV show by media_type', () => {
      component.movie = { id: 1, name: 'Show', media_type: 'tv', overview: '', poster_path: null, backdrop_path: null, first_air_date: '', vote_average: 0, vote_count: 0 } as any;
      expect(component.isTVShow).toBeTrue();
      expect(component.isMovie).toBeFalse();
    });

    it('should identify movie by title field when no media_type', () => {
      component.movie = { id: 1, title: 'Movie', overview: '', poster_path: null, backdrop_path: null, release_date: '', vote_average: 0, vote_count: 0 } as any;
      expect(component.isMovie).toBeTrue();
    });
  });

  describe('France availability check', () => {
    it('should check France availability when platforms are provided', () => {
      const newFixture = TestBed.createComponent(MovieCardComponent);
      const newComponent = newFixture.componentInstance;
      newComponent.movie = { ...mockMovie } as any;
      newComponent.selectedPlatforms = [8]; // Netflix
      newFixture.detectChanges();

      expect(movieServiceSpy.getMovieWatchProviders).toHaveBeenCalledWith(123);
      expect(newComponent.isAvailableInFrance).toBeTrue();
    });

    it('should not check France availability when no platforms selected', () => {
      movieServiceSpy.getMovieWatchProviders.calls.reset();

      const newFixture = TestBed.createComponent(MovieCardComponent);
      const newComponent = newFixture.componentInstance;
      newComponent.movie = { ...mockMovie } as any;
      newComponent.selectedPlatforms = [];
      newFixture.detectChanges();

      expect(movieServiceSpy.getMovieWatchProviders).not.toHaveBeenCalled();
    });
  });

  describe('getGenreName', () => {
    it('should return genre name for known ID', () => {
      expect(component.getGenreName(28)).toBe('Action');
      expect(component.getGenreName(35)).toBe('Comedy');
    });

    it('should return Unknown for unknown genre ID', () => {
      expect(component.getGenreName(99999)).toBe('Unknown');
    });
  });

  describe('contentReleaseDate', () => {
    it('should return release_date for movies', () => {
      component.movie = { ...mockMovie, release_date: '2023-06-15' } as any;
      expect(component.contentReleaseDate).toBe('2023-06-15');
    });

    it('should return first_air_date for TV shows', () => {
      component.movie = { id: 1, name: 'Show', media_type: 'tv', first_air_date: '2023-01-01', overview: '', poster_path: null, backdrop_path: null, vote_average: 0, vote_count: 0 } as any;
      expect(component.contentReleaseDate).toBe('2023-01-01');
    });

    it('should return null when no date available', () => {
      component.movie = { id: 1, title: 'Movie', media_type: 'movie', release_date: '', overview: '', poster_path: null, backdrop_path: null, vote_average: 0, vote_count: 0 } as any;
      expect(component.contentReleaseDate).toBeFalsy();
    });
  });
});
