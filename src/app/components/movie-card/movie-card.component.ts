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
  
  // Environment configuration for image paths
  private imageBaseUrl = 'https://image.tmdb.org/t/p/';
  private posterSize = 'w500';
  
  constructor(private movieService: MovieService) {}
  
  ngOnInit(): void {
    if (this.selectedPlatforms.length > 0) {
      this.checkFranceAvailability();
    }
  }
  
  checkFranceAvailability(): void {
    if (!this.movie?.id || this.selectedPlatforms.length === 0) {
      return;
    }
    
    this.checkingAvailability = true;
    
    this.movieService.getMovieWatchProviders(this.movie.id).subscribe({
      next: (data) => {
        const watchProviders = data.results || {};
        const franceData = watchProviders['FR'];
        
        if (franceData) {
          // Combine all providers (flatrate, rent, buy)
          const allProviders = [
            ...(franceData.flatrate || []),
            ...(franceData.rent || []),
            ...(franceData.buy || [])
          ];
          
          // Check if any provider matches selected platforms
          this.isAvailableInFrance = allProviders.some(
            (provider: any) => this.selectedPlatforms.includes(provider.provider_id)
          );
        } else {
          this.isAvailableInFrance = false;
        }
        
        this.checkingAvailability = false;
      },
      error: (err) => {
        console.error('Error checking France availability:', err);
        this.isAvailableInFrance = false;
        this.checkingAvailability = false;
      }
    });
  }
  
  getFullPosterPath(posterPath: string | null): string {
    if (posterPath) {
      return `${this.imageBaseUrl}${this.posterSize}${posterPath}`;
    }
    return 'assets/no-image.png';
  }
  
  getYear(dateString: string | null): string {
    if (!dateString) return 'Unknown';
    return new Date(dateString).getFullYear().toString();
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
