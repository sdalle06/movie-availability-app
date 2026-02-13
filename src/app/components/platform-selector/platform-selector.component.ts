import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MovieService } from '../../services/movie.service';
import { WatchProvider } from '../../models/tmdb.models';

@Component({
  selector: 'app-platform-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './platform-selector.component.html',
  styleUrls: ['./platform-selector.component.scss']
})
export class PlatformSelectorComponent implements OnInit {
  @Input() selectedPlatforms: number[] = [];
  @Output() platformsChange = new EventEmitter<number[]>();

  providers: WatchProvider[] = [];
  allProviders: WatchProvider[] = [];
  popularProviders: WatchProvider[] = [];
  showAllProviders: boolean = false;
  loading = false;
  error = '';

  private destroyRef = inject(DestroyRef);

  // Define popular streaming services (in order of popularity)
  popularProviderIds: number[] = [
    8,    // Netflix
    119,  // Amazon Prime Video
    337,  // Disney+
    350,  // Apple TV+
    531,  // Paramount+
    1899, // Max
  ];

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    // Load selected platforms from localStorage if available
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
    } else {
      // If no platforms are selected, select all popular providers by default
      this.selectedPlatforms = [...this.popularProviderIds];
      localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
    }

    this.loadProviders();
  }

  loadProviders(): void {
    this.loading = true;

    forkJoin({
      global: this.movieService.getWatchProvidersByRegion(),
      france: this.movieService.getWatchProvidersByRegion('FR')
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ global, france }) => {
        // Get only providers available in France
        this.allProviders = france.results
          ? [...france.results].sort((a, b) => a.provider_name.localeCompare(b.provider_name))
          : [];

        // If Amazon Prime Video (ID: 119) doesn't exist in France providers, add it
        const hasPrimeVideo119 = this.allProviders.some(p => p.provider_id === 119);
        if (!hasPrimeVideo119) {
          const globalPrimeVideo = global.results?.find(p => p.provider_id === 119);
          if (globalPrimeVideo) {
            this.allProviders.push(globalPrimeVideo);
          } else {
            this.allProviders.push({
              provider_id: 119,
              provider_name: 'Amazon Prime Video',
              logo_path: '/68MNrwlkpF7WnmNPXLah69CR5cb.jpg'
            });
          }
        }

        // Get popular providers based on our predefined list
        this.popularProviders = this.allProviders
          .filter(provider => this.popularProviderIds.includes(provider.provider_id))
          .sort((a, b) => {
            const indexA = this.popularProviderIds.indexOf(a.provider_id);
            const indexB = this.popularProviderIds.indexOf(b.provider_id);
            return indexA - indexB;
          });

        if (!this.allProviders) this.allProviders = [];
        if (!this.popularProviders) this.popularProviders = [];

        // By default, show only popular providers
        this.providers = this.showAllProviders ? this.allProviders : this.popularProviders;

        // Clean up selectedPlatforms: remove any IDs not present in allProviders
        const validIds = new Set(this.allProviders.map(p => p.provider_id));
        const cleaned = this.selectedPlatforms.filter(id => validIds.has(id));
        if (cleaned.length !== this.selectedPlatforms.length) {
          this.selectedPlatforms = cleaned;
          localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
        }

        this.loading = false;

        // Emit initial platforms after providers are loaded
        if (this.selectedPlatforms.length > 0) {
          this.platformsChange.emit([...this.selectedPlatforms]);
        }
      },
      error: (err) => {
        console.error('Error loading providers:', err);
        this.error = 'Failed to load streaming platforms';
        this.loading = false;
      }
    });
  }

  togglePlatform(providerId: number): void {
    const index = this.selectedPlatforms.indexOf(providerId);

    if (index === -1) {
      this.selectedPlatforms.push(providerId);
    } else {
      this.selectedPlatforms.splice(index, 1);
    }

    localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
    this.platformsChange.emit([...this.selectedPlatforms]);
  }

  isPlatformSelected(providerId: number): boolean {
    return this.selectedPlatforms.includes(providerId);
  }

  get visibleSelectedCount(): number {
    const visibleIds = new Set(this.providers.map(p => p.provider_id));
    return this.selectedPlatforms.filter(id => visibleIds.has(id)).length;
  }

  clearAll(): void {
    this.selectedPlatforms = [];
    localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
    this.platformsChange.emit(this.selectedPlatforms);
  }

  toggleShowAllProviders(): void {
    this.showAllProviders = !this.showAllProviders;
    this.providers = this.showAllProviders ? this.allProviders : this.popularProviders;
  }
}
