import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MovieService } from '../../services/movie.service';
import { WatchlistService } from '../../services/watchlist.service';
import { isHomeRegion, isPortabilityLocked, isUsableRegion } from '../../utils/region.util';
import {
  Movie,
  TVShow,
  WatchProvider,
  CountryWatchProviders,
  Country,
  PlatformAvailability
} from '../../models/tmdb.models';

interface CountryAvailability {
  countryCode: string;
  countryName: string;
  providers: WatchProvider[];
}

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [
    CommonModule,
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
  movie: Movie | TVShow | null = null;
  watchProviders: Record<string, CountryWatchProviders> | null = null;
  loading = true;
  error = false;
  errorMessage = '';
  watchProvidersError = false;
  countries: Country[] = [];
  selectedPlatforms: number[] = [];
  isAvailableInFrance = false;
  contentType: 'movie' | 'tv' = 'movie';

  private destroyRef = inject(DestroyRef);

  get isMovie(): boolean {
    return this.contentType === 'movie';
  }

  get isTVShow(): boolean {
    return this.contentType === 'tv';
  }

  get contentTitle(): string {
    if (!this.movie) return 'Unknown Title';
    return ('title' in this.movie ? this.movie.title : undefined)
      || ('name' in this.movie ? this.movie.name : undefined)
      || 'Unknown Title';
  }

  get contentReleaseDate(): string {
    if (!this.movie) return '';
    return ('release_date' in this.movie ? this.movie.release_date : undefined)
      || ('first_air_date' in this.movie ? this.movie.first_air_date : undefined)
      || '';
  }

  getGenreNames(): string {
    if (!this.movie?.genres || this.movie.genres.length === 0) {
      return '';
    }
    return this.movie.genres.map(g => g.name).join(', ');
  }

  availableCountries: CountryAvailability[] = [];
  availablePlatforms: PlatformAvailability[] = [];
  countryMap: Record<string, string> = {};
  /** EU/EEA-except-France countries where it streams but the user can't reach. */
  lockedCountryCount = 0;

  // Environment configuration for image paths
  private imageBaseUrl = 'https://image.tmdb.org/t/p/';
  private posterSize = 'w500';
  private backdropSize = 'original';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService,
    private watchlistService: WatchlistService
  ) {}

  get isInWatchlist(): boolean {
    return !!this.movie && this.watchlistService.isInList(this.movie.id, this.contentType);
  }

  get watchlistButtonLabel(): string {
    if (this.isInWatchlist) {
      return 'In Watchlist';
    }
    return this.isAvailableInFrance ? 'Add to Watchlist' : 'Notify when available';
  }

  get watchlistButtonIcon(): string {
    if (this.isInWatchlist) {
      return 'bookmark';
    }
    return this.isAvailableInFrance ? 'bookmark_add' : 'notifications_active';
  }

  toggleWatchlist(): void {
    if (!this.movie) {
      return;
    }
    this.watchlistService.toggle({
      id: this.movie.id,
      mediaType: this.contentType,
      title: this.contentTitle,
      posterPath: this.movie.poster_path,
      providers: this.watchProviders ?? {},
      selectedPlatforms: this.selectedPlatforms
    });
  }

  ngOnInit(): void {
    // Get selected platforms from localStorage if available
    const storedPlatforms = localStorage.getItem('selectedPlatforms');
    if (storedPlatforms) {
      try {
        const parsed = JSON.parse(storedPlatforms);
        if (Array.isArray(parsed)) {
          this.selectedPlatforms = parsed;
        }
      } catch {
        localStorage.removeItem('selectedPlatforms');
      }
    }

    // Combine route.url and route.params to avoid race condition
    combineLatest([this.route.url, this.route.params]).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(([urlSegments, params]) => {
      this.contentType = urlSegments[0]?.path === 'tv' ? 'tv' : 'movie';
      const contentId = +params['id'];
      if (contentId) {
        this.loadContentDetails(contentId);
      }
    });
  }

  private loadContentDetails(contentId: number): void {
    this.loading = true;
    this.error = false;
    this.watchProvidersError = false;

    const detailsObservable: Observable<Movie | TVShow> = this.isMovie
      ? this.movieService.getMovieDetails(contentId)
      : this.movieService.getTVDetails(contentId);

    const watchProvidersObservable = this.isMovie
      ? this.movieService.getMovieWatchProviders(contentId)
      : this.movieService.getTVWatchProviders(contentId);

    detailsObservable.pipe(
      switchMap(movieDetails => {
        this.movie = movieDetails;
        return forkJoin({
          watchProviders: watchProvidersObservable.pipe(
            catchError(err => {
              console.error('Error loading watch providers:', err);
              this.watchProvidersError = true;
              return of({ id: 0, results: {} as Record<string, CountryWatchProviders> });
            })
          ),
          countries: this.movieService.getCountries().pipe(
            catchError(err => {
              console.error('Error loading countries:', err);
              return of([] as Country[]);
            })
          )
        });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.watchProviders = data.watchProviders.results;

        if (Array.isArray(data.countries)) {
          data.countries.forEach(country => {
            this.countryMap[country.iso_3166_1] = country.english_name;
          });
        }

        this.loading = false;
        this.findAvailableCountries();
        this.organizeByPlatform();
        this.checkFranceAvailability();
      },
      error: (err) => {
        console.error('Error loading content details:', err);
        this.error = true;
        this.loading = false;

        if (err.status === 404) {
          this.errorMessage = `${this.contentType === 'movie' ? 'Movie' : 'TV Show'} not found. The ID ${this.route.snapshot.params['id']} doesn't exist in the database.`;
        } else {
          this.errorMessage = `Failed to load ${this.contentType === 'movie' ? 'movie' : 'TV show'} details. Please try again later.`;
        }
      }
    });
  }

  findAvailableCountries(): void {
    this.availableCountries = [];

    if (!this.watchProviders || Object.keys(this.watchProviders).length === 0) {
      return;
    }

    const tempAvailableCountries: CountryAvailability[] = [];

    Object.entries(this.watchProviders).forEach(([countryCode, data]) => {
      const allProviders: WatchProvider[] = [
        ...(data.flatrate || []),
        ...(data.rent || []),
        ...(data.buy || [])
      ];

      const matchingProviders = allProviders.filter(
        provider => this.selectedPlatforms.includes(provider.provider_id)
      );

      if (matchingProviders.length > 0) {
        tempAvailableCountries.push({
          countryCode,
          countryName: this.getCountryName(countryCode),
          providers: matchingProviders
        });
      }
    });

    tempAvailableCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));

    // EU/EEA-except-France availability is unreachable from France (portability
    // serves the French catalogue even over a VPN), so it's surfaced only as a
    // muted footnote count rather than as actionable availability.
    this.lockedCountryCount = tempAvailableCountries
      .filter(c => isPortabilityLocked(c.countryCode)).length;

    const usable = tempAvailableCountries.filter(c => isUsableRegion(c.countryCode));
    const france = usable.find(c => isHomeRegion(c.countryCode));
    if (france) {
      this.availableCountries.push(france);
    }
    this.availableCountries.push(
      ...usable.filter(c => !isHomeRegion(c.countryCode))
    );
  }

  organizeByPlatform(): void {
    this.availablePlatforms = [];

    if (this.availableCountries.length === 0) {
      return;
    }

    const platformMap = new Map<number, PlatformAvailability>();

    this.availableCountries.forEach(country => {
      country.providers.forEach(provider => {
        const platformId = provider.provider_id;

        if (!platformMap.has(platformId)) {
          platformMap.set(platformId, {
            platformId: platformId,
            platformName: provider.provider_name,
            logoPath: provider.logo_path,
            countries: []
          });
        }

        const platform = platformMap.get(platformId)!;

        if (!platform.countries.some(c => c.countryCode === country.countryCode)) {
          platform.countries.push({
            countryCode: country.countryCode,
            countryName: country.countryName
          });
        }
      });
    });

    this.availablePlatforms = Array.from(platformMap.values());
    this.availablePlatforms.sort((a, b) => a.platformName.localeCompare(b.platformName));

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

  getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));

    return String.fromCodePoint(...codePoints);
  }

  checkFranceAvailability(): void {
    if (!this.watchProviders || !this.selectedPlatforms.length) {
      this.isAvailableInFrance = false;
      return;
    }

    const franceData = this.watchProviders['FR'];

    if (franceData) {
      const allProviders: WatchProvider[] = [
        ...(franceData.flatrate || []),
        ...(franceData.rent || []),
        ...(franceData.buy || [])
      ];

      this.isAvailableInFrance = allProviders.some(
        provider => this.selectedPlatforms.includes(provider.provider_id)
      );
    } else {
      this.isAvailableInFrance = false;
    }
  }

  getFranceFlag(): string {
    return '🇫🇷';
  }

  getCountryName(countryCode: string): string {
    if (this.countryMap[countryCode]) {
      return this.countryMap[countryCode];
    }

    const commonCountries: Record<string, string> = {
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
