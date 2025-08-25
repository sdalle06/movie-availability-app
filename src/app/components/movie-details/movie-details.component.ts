import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';

import { MovieService } from '../../services/movie.service';

interface CountryAvailability {
  countryCode: string;
  countryName: string;
  providers: any[];
}

interface PlatformAvailability {
  platformId: number;
  platformName: string;
  logoPath: string;
  countries: {
    countryCode: string;
    countryName: string;
  }[];
}

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [
    CommonModule,
    // RouterLink removed as it's not used in the template
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatListModule
  ],
  templateUrl: './movie-details.component.html',
  styleUrls: ['./movie-details.component.scss']
})
export class MovieDetailsComponent implements OnInit {
  movie: any = null;
  watchProviders: any = {};
  loading = true;
  error = '';
  movieId: number = 0;
  selectedPlatforms: number[] = [];
  availableCountries: CountryAvailability[] = [];
  availablePlatforms: PlatformAvailability[] = [];
  countryMap: {[code: string]: string} = {};
  isAvailableInFrance = false;
  
  // List of European country codes
  private europeanCountryCodes: string[] = [
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 
    'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 
    'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 
    'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA', 'GB', 'VA'
  ];

  // Environment configuration for image paths
  private imageBaseUrl = 'https://image.tmdb.org/t/p/';
  private posterSize = 'w500';
  private backdropSize = 'original';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService
  ) {}

  ngOnInit(): void {
    // Get movie ID from route params
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.movieId = +id;
        this.loadMovieDetails();
      } else {
        this.router.navigate(['/movies']);
      }
    });

    // Get selected platforms from localStorage if available
    const storedPlatforms = localStorage.getItem('selectedPlatforms');
    if (storedPlatforms) {
      this.selectedPlatforms = JSON.parse(storedPlatforms);
    }

    // Load countries for mapping country codes to names
    this.loadCountries();
  }

  loadMovieDetails(): void {
    this.loading = true;
    
    // Load movie details
    this.movieService.getMovieDetails(this.movieId).subscribe({
      next: (data) => {
        this.movie = data;
        // Load watch providers after movie details are loaded
        this.loadWatchProviders();
      },
      error: (err) => {
        console.error('Error loading movie details:', err);
        this.error = 'Failed to load movie details';
        this.loading = false;
      }
    });
  }

  loadWatchProviders(): void {
    this.movieService.getMovieWatchProviders(this.movieId).subscribe({
      next: (data) => {
        this.watchProviders = data.results || {};
        this.findAvailableCountries();
        this.organizeByPlatform();
        this.checkFranceAvailability();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading watch providers:', err);
        this.error = 'Failed to load movie availability';
        this.loading = false;
      }
    });
  }

  loadCountries(): void {
    this.movieService.getCountries().subscribe({
      next: (data) => {
        // Create a map of country codes to country names
        data.forEach((country: any) => {
          this.countryMap[country.iso_3166_1] = country.english_name;
        });
      },
      error: (err) => {
        console.error('Error loading countries:', err);
      }
    });
  }

  findAvailableCountries(): void {
    this.availableCountries = [];
    
    if (!this.watchProviders || Object.keys(this.watchProviders).length === 0) {
      return;
    }
    
    // Temporary array to hold all available countries before filtering
    const tempAvailableCountries: CountryAvailability[] = [];
    
    // Check each country for availability on selected platforms
    Object.entries(this.watchProviders).forEach(([countryCode, data]: [string, any]) => {
      // Combine all providers (flatrate, rent, buy)
      const allProviders = [
        ...(data.flatrate || []),
        ...(data.rent || []),
        ...(data.buy || [])
      ];
      
      // Filter providers that match user's selected platforms
      const matchingProviders = allProviders.filter(
        (provider: any) => this.selectedPlatforms.includes(provider.provider_id)
      );
      
      // If there are matching providers, add to temporary countries array
      if (matchingProviders.length > 0) {
        tempAvailableCountries.push({
          countryCode,
          countryName: this.getCountryName(countryCode),
          providers: matchingProviders
        });
      }
    });
    
    // Filter countries based on region
    // For European countries, only show France
    const europeanCountries = tempAvailableCountries.filter(country => 
      this.europeanCountryCodes.includes(country.countryCode)
    );
    
    // If there are European countries available, only show France if it's available
    if (europeanCountries.length > 0) {
      const franceAvailability = europeanCountries.find(country => country.countryCode === 'FR');
      if (franceAvailability) {
        // Only add France from European countries
        this.availableCountries.push(franceAvailability);
      }
    }
    
    // Add all non-European countries
    const nonEuropeanCountries = tempAvailableCountries.filter(country => 
      !this.europeanCountryCodes.includes(country.countryCode)
    );
    this.availableCountries.push(...nonEuropeanCountries);
    
    // Sort countries alphabetically by name
    this.availableCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));
  }
  
  organizeByPlatform(): void {
    this.availablePlatforms = [];
    
    if (this.availableCountries.length === 0) {
      return;
    }
    
    // Create a map of platform IDs to their availability data
    const platformMap = new Map<number, PlatformAvailability>();
    
    // Process each country
    this.availableCountries.forEach(country => {
      // Process each provider in the country
      country.providers.forEach(provider => {
        const platformId = provider.provider_id;
        
        // If this platform hasn't been added yet, create a new entry
        if (!platformMap.has(platformId)) {
          platformMap.set(platformId, {
            platformId: platformId,
            platformName: provider.provider_name,
            logoPath: provider.logo_path,
            countries: []
          });
        }
        
        // Add this country to the platform's list of countries
        const platform = platformMap.get(platformId)!;
        
        // Check if country is already in the list to avoid duplicates
        if (!platform.countries.some(c => c.countryCode === country.countryCode)) {
          platform.countries.push({
            countryCode: country.countryCode,
            countryName: country.countryName
          });
        }
      });
    });
    
    // Convert the map to an array and sort by platform name
    this.availablePlatforms = Array.from(platformMap.values());
    this.availablePlatforms.sort((a, b) => a.platformName.localeCompare(b.platformName));
    
    // Sort countries within each platform
    this.availablePlatforms.forEach(platform => {
      platform.countries.sort((a, b) => a.countryName.localeCompare(b.countryName));
    });
  }

  getFullPosterPath(posterPath: string | null): string {
    if (posterPath) {
      return `${this.imageBaseUrl}${this.posterSize}${posterPath}`;
    }
    return 'assets/no-image.png';
  }

  getFullBackdropPath(backdropPath: string | null): string {
    if (backdropPath) {
      return `${this.imageBaseUrl}${this.backdropSize}${backdropPath}`;
    }
    return '';
  }

  getYear(dateString: string | null): string {
    if (!dateString) return 'Unknown';
    return new Date(dateString).getFullYear().toString();
  }

  formatRuntime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  goBack(): void {
    this.router.navigate(['/movies']);
  }
  
  /**
   * Convert a country code to a flag emoji
   * @param countryCode ISO 3166-1 alpha-2 country code
   * @returns Flag emoji for the country
   */
  getFlagEmoji(countryCode: string): string {
    // For each letter, get the Unicode regional indicator symbol letter
    // Regional indicator symbols are 127397 (0x1F1E6) higher than ASCII
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    
    // Convert the code points to emoji
    return String.fromCodePoint(...codePoints);
  }
  
  checkFranceAvailability(): void {
    if (!this.watchProviders || !this.selectedPlatforms.length) {
      this.isAvailableInFrance = false;
      return;
    }
    
    const franceData = this.watchProviders['FR'];
    
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
  }
  
  getFranceFlag(): string {
    return '🇫🇷';
  }
  
  getCountryName(countryCode: string): string {
    // First try the loaded country map
    if (this.countryMap[countryCode]) {
      return this.countryMap[countryCode];
    }
    
    // Fallback to common country names
    const commonCountries: {[key: string]: string} = {
      'US': 'United States',
      'CA': 'Canada',
      'FR': 'France',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'AU': 'Australia',
      'JP': 'Japan',
      'KR': 'South Korea',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'IN': 'India',
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'TW': 'Taiwan',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'ZA': 'South Africa',
      'EG': 'Egypt',
      'TR': 'Turkey',
      'RU': 'Russia',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'SI': 'Slovenia',
      'SK': 'Slovakia',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
      'FI': 'Finland',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'IS': 'Iceland',
      'IE': 'Ireland',
      'PT': 'Portugal',
      'GR': 'Greece',
      'CY': 'Cyprus',
      'MT': 'Malta',
      'LU': 'Luxembourg',
      'AT': 'Austria',
      'CH': 'Switzerland',
      'LI': 'Liechtenstein',
      'MC': 'Monaco',
      'AD': 'Andorra',
      'SM': 'San Marino',
      'VA': 'Vatican City',
      'CN': 'China',
      'NZ': 'New Zealand'
    };
    
    return commonCountries[countryCode] || countryCode;
  }
}
