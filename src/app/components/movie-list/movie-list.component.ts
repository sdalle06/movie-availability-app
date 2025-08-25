import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { MovieService } from '../../services/movie.service';
import { SearchComponent } from '../search/search.component';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { PlatformSelectorComponent } from '../platform-selector/platform-selector.component';

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
  movies: any[] = [];
  loading = false;
  selectedPlatforms: number[] = [];
  searchPerformed = false;
  lastSearchQuery = '';

  constructor(
    private movieService: MovieService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  onSearch(searchData: {query: string, contentType: string}): void {
    if (!searchData.query.trim()) {
      return;
    }
    
    this.loading = true;
    this.searchPerformed = true;
    this.lastSearchQuery = searchData.query;
    
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
        searchObservable = this.movieService.multiSearch(searchData.query);
        break;
    }
    
    searchObservable.subscribe({
      next: (response: any) => {
        this.movies = response.results;
        console.log('Search results:', response.results);
        console.log('First result:', response.results[0]);
        this.loading = false;
        
        // If results are available, scroll to them with a small delay
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
      error: (error: any) => {
        console.error('Error searching:', error);
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
    // Save selected platforms to localStorage for sharing with other components
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms));
  }
  
  resetSearch(): void {
    this.movies = [];
    this.searchPerformed = false;
    this.lastSearchQuery = '';
  }
}
