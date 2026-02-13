import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MovieService } from '../../services/movie.service';
import { SearchComponent } from '../search/search.component';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { PlatformSelectorComponent } from '../platform-selector/platform-selector.component';
import { SearchResultItem } from '../../models/tmdb.models';

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    SearchComponent,
    MovieCardComponent,
    PlatformSelectorComponent
  ],
  templateUrl: './movie-list.component.html',
  styleUrls: ['./movie-list.component.scss']
})
export class MovieListComponent implements OnInit {
  movies: SearchResultItem[] = [];
  loading = false;
  selectedPlatforms: number[] = [];
  searchPerformed = false;
  lastSearchQuery = '';
  lastContentType = 'multi';

  private destroyRef = inject(DestroyRef);

  constructor(
    private movieService: MovieService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.restoreSearchState();
  }

  private restoreSearchState(): void {
    try {
      const saved = sessionStorage.getItem('searchState');
      if (saved) {
        const state = JSON.parse(saved);
        this.lastSearchQuery = state.query || '';
        this.lastContentType = state.contentType || 'multi';
        this.movies = state.results || [];
        this.searchPerformed = state.searchPerformed || false;
      }
    } catch {
      sessionStorage.removeItem('searchState');
    }
  }

  private saveSearchState(): void {
    const state = {
      query: this.lastSearchQuery,
      contentType: this.lastContentType,
      results: this.movies,
      searchPerformed: this.searchPerformed
    };
    sessionStorage.setItem('searchState', JSON.stringify(state));
  }

  onSearch(searchData: {query: string, contentType: string}): void {
    if (!searchData.query.trim()) {
      return;
    }

    this.loading = true;
    this.searchPerformed = true;
    this.lastSearchQuery = searchData.query;
    this.lastContentType = searchData.contentType;

    let searchObservable;

    switch (searchData.contentType) {
      case 'movie':
        searchObservable = this.movieService.searchMovies(searchData.query);
        break;
      case 'tv':
        searchObservable = this.movieService.searchTVShows(searchData.query);
        break;
      case 'multi':
      default:
        searchObservable = this.movieService.searchMulti(searchData.query);
        break;
    }

    searchObservable.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        this.movies = response.results as SearchResultItem[];
        this.loading = false;
        this.saveSearchState();

        if (this.movies.length > 0) {
          setTimeout(() => {
            const moviesSection = document.getElementById('movies-section');
            if (moviesSection) {
              moviesSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 200);
        }

        if (this.movies.length === 0) {
          const contentTypeText = searchData.contentType === 'movie' ? 'movies' :
                                 searchData.contentType === 'tv' ? 'TV shows' : 'content';
          this.snackBar.open(`No ${contentTypeText} found. Try a different search term.`, 'Close', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.loading = false;
        this.movies = [];

        this.snackBar.open('Error searching. Please try again.', 'Close', {
          duration: 3000
        });
      }
    });
  }

  onSelectMovie(movieId: number): void {
    this.router.navigate(['/movies', movieId]);
  }

  onPlatformsChange(platforms: number[]): void {
    this.selectedPlatforms = platforms;
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms));
  }

  resetSearch(): void {
    this.movies = [];
    this.searchPerformed = false;
    this.lastSearchQuery = '';
    this.lastContentType = 'multi';
    sessionStorage.removeItem('searchState');
  }
}
