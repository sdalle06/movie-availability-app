import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.scss']
})
export class MovieCardComponent implements OnInit {
  @Input() movie: any;
  @Input() selectedPlatforms: number[] = [];
  
  isAvailableInFrance = false;
  checkingAvailability = false;
  
  get isMovie(): boolean {
    return this.movie?.media_type === 'movie' || (!this.movie?.media_type && this.movie?.title);
  }
  
  get isTVShow(): boolean {
    return this.movie?.media_type === 'tv' || (!this.movie?.media_type && this.movie?.name);
  }
  
  get contentTitle(): string {
    return this.movie?.title || this.movie?.name || 'Unknown Title';
  }
  
  get contentReleaseDate(): string | null {
    // For movies, use release_date
    if (this.isMovie && this.movie?.release_date) {
      return this.movie.release_date;
    }
    
    // For TV shows, use first_air_date
    if (this.isTVShow && this.movie?.first_air_date) {
      return this.movie.first_air_date;
    }
    
    // Fallback: try both fields regardless of media type
    return this.movie?.release_date || this.movie?.first_air_date || null;
  }
  
  // Environment configuration for image paths
  private imageBaseUrl = 'https://image.tmdb.org/t/p/';
  private posterSize = 'w500';
  
  constructor(private movieService: MovieService) {}
  
  ngOnInit(): void {
    if (this.selectedPlatforms.length > 0) {
      this.checkFranceAvailability();
    }
  }
  
  private checkFranceAvailability(): void {
    if (!this.movie?.id) {
      return;
    }
    
    this.checkingAvailability = true;
    
    // Use appropriate service method based on content type
    const watchProvidersObservable = this.isMovie 
      ? this.movieService.getMovieWatchProviders(this.movie.id)
      : this.movieService.getTVWatchProviders(this.movie.id);
    
    watchProvidersObservable.subscribe({
      next: (response) => {
        this.checkingAvailability = false;
        
        // Check if content is available in France
        const franceProviders = response.results?.FR;
        if (franceProviders) {
          const availableProviders = [
            ...(franceProviders.flatrate || []),
            ...(franceProviders.rent || []),
            ...(franceProviders.buy || [])
          ];
          
          // Check if any of the available providers match selected platforms
          this.isAvailableInFrance = availableProviders.some((provider: any) => 
            this.selectedPlatforms.includes(provider.provider_id)
          );
        } else {
          this.isAvailableInFrance = false;
        }
      },
      error: (error) => {
        console.error('Error checking France availability:', error);
        this.checkingAvailability = false;
        this.isAvailableInFrance = false;
      }
    });
  }
  
  getFullPosterPath(posterPath: string | null): string {
    if (posterPath) {
      return `${this.imageBaseUrl}${this.posterSize}${posterPath}`;
    }
    // Return a data URL for a simple gray placeholder instead of missing file
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgMTc1SDE3NVYyMjVIMTI1VjE3NVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+CjxwYXRoIGQ9Ik0xNDMuNzUgMjA2LjI1TDE1Ni4yNSAxOTMuNzVMMTc1IDIxMi41TDE1Ni4yNSAyMzEuMjVMMTQzLjc1IDIxOC43NUwxMzEuMjUgMjMxLjI1TDEyNSAyMjVMMTM3LjUgMjEyLjVMMTI1IDE5My43NUwxMzEuMjUgMTg3LjVMMTQzLjc1IDIwNi4yNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
  }
  
  getYear(dateString: string | null): string {
    if (!dateString || dateString.trim() === '') {
      // Try to get year from alternative sources for TV shows
      if (this.isTVShow) {
        // Check if there's a year in the name/title
        const titleMatch = this.contentTitle.match(/\((\d{4})\)/);
        if (titleMatch) {
          return titleMatch[1];
        }
      }
      return 'TBA'; // "To Be Announced" instead of "Unknown"
    }
    const year = new Date(dateString).getFullYear();
    return isNaN(year) ? 'TBA' : year.toString();
  }
  
  getGenreName(genreId: number): string {
    const genres = [
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 99, name: 'Documentary' },
      { id: 18, name: 'Drama' },
      { id: 10751, name: 'Family' },
      { id: 14, name: 'Fantasy' },
      { id: 36, name: 'History' },
      { id: 27, name: 'Horror' },
      { id: 10402, name: 'Music' },
      { id: 9648, name: 'Mystery' },
      { id: 10749, name: 'Romance' },
      { id: 878, name: 'Science Fiction' },
      { id: 10770, name: 'TV Movie' },
      { id: 53, name: 'Thriller' },
      { id: 10752, name: 'War' },
      { id: 37, name: 'Western' }
    ];
    
    const genre = genres.find(g => g.id === genreId);
    return genre ? genre.name : 'Unknown';
  }
  
  getFranceFlag(): string {
    return '🇫🇷';
  }
}
