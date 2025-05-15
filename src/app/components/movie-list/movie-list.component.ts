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

  onSearch(query: string): void {
    if (!query.trim()) return;
    
    this.loading = true;
    this.searchPerformed = true;
    this.lastSearchQuery = query;
    
    this.movieService.searchMovies(query).subscribe({
      next: (response) => {
        this.movies = response.results;
        this.loading = false;
        
        if (this.movies.length === 0) {
          this.snackBar.open('No movies found. Try a different search term.', 'Close', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error searching movies:', error);
        this.loading = false;
        this.movies = [];
        
        this.snackBar.open('Error searching movies. Please try again.', 'Close', {
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
