import { Component, EventEmitter, Input, OnInit, AfterViewInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MovieService } from '../../services/movie.service';

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
export class PlatformSelectorComponent implements OnInit, AfterViewInit {
  @Input() selectedPlatforms: number[] = [];
  @Output() platformsChange = new EventEmitter<number[]>();
  
  providers: any[] = [];
  allProviders: any[] = [];
  popularProviders: any[] = [];
  showAllProviders: boolean = false;
  loading = false;
  error = '';
  
  // Define popular streaming services (in order of popularity)
  popularProviderIds: number[] = [
    8,    // Netflix
    119,  // Amazon Prime Video 
    337,  // Disney+
    350,  // Apple TV+
    283,  // Crunchyroll
    1899, // Max
  ];

  constructor(private movieService: MovieService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Load selected platforms from localStorage if available
    const storedPlatforms = localStorage.getItem('selectedPlatforms');
    if (storedPlatforms) {
      this.selectedPlatforms = JSON.parse(storedPlatforms);
      // Don't emit here to avoid ExpressionChangedAfterItHasBeenCheckedError
    } else {
      // If no platforms are selected, select all popular providers by default
      this.selectedPlatforms = [...this.popularProviderIds];
      localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
    }
  }
  
  ngAfterViewInit(): void {
    // Load providers after view init to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadProviders();
      // Now it's safe to emit the platforms change
      if (this.selectedPlatforms.length > 0) {
        this.platformsChange.emit([...this.selectedPlatforms]);
      }
      this.cdr.detectChanges();
    }, 0);
  }

  loadProviders(): void {
    this.loading = true;
    this.movieService.getWatchProviders().subscribe({
      next: (data) => {
        console.log('TMDB API returned all providers:', data.results.length);
        
        // Check if Prime Video exists in the data
        const primeVideo = data.results.find((p: any) => 
          p.provider_name.includes('Prime') || p.provider_id === 9
        );
        console.log('Prime Video in global list:', primeVideo ? 
          `${primeVideo.provider_name} (ID: ${primeVideo.provider_id})` : 'Not found');
        
        // Get providers available in France (country code 'FR')
        this.movieService.getWatchProvidersByRegion('FR').subscribe({
          next: (franceData: any) => {
            // Get only providers available in France (83 providers)
            this.allProviders = franceData.results ? franceData.results
              .sort((a: any, b: any) => a.provider_name.localeCompare(b.provider_name)) : [];
              
            console.log('Providers available in France:', this.allProviders.length);
            
            // Check for Prime Video in the France providers list
            const primeVideoInFrance = this.allProviders.filter(p => 
              p.provider_name.includes('Prime') || 
              p.provider_id === 9 || 
              p.provider_id === 119 || 
              p.provider_id === 10
            );
            
            console.log('Prime Video providers in France:', 
              primeVideoInFrance.length > 0 ? 
                primeVideoInFrance.map((p: any) => `${p.provider_name} (ID: ${p.provider_id})`) : 
                'None found');
            
            // Check if ID 119 (Amazon Prime Video) exists in the France providers list
            const hasPrimeVideo119 = this.allProviders.some(p => p.provider_id === 119);
            console.log('Amazon Prime Video (ID: 119) exists in France providers:', hasPrimeVideo119);
            
            // If ID 119 doesn't exist in the France providers, we need to manually add it
            if (!hasPrimeVideo119) {
              console.log('Amazon Prime Video (ID: 119) is not available in France, adding it manually');
              
              // Try to find it in the global providers list
              const globalPrimeVideo = data.results.find((p: any) => p.provider_id === 119);
              if (globalPrimeVideo) {
                console.log('Found Amazon Prime Video (ID: 119) in global list, adding it manually');
                this.allProviders.push(globalPrimeVideo);
              } else {
                // If not found in global list, create a manual entry
                console.log('Creating manual entry for Amazon Prime Video (ID: 119)');
                const manualPrimeVideo = {
                  provider_id: 119,
                  provider_name: 'Amazon Prime Video',
                  logo_path: '/68MNrwlkpF7WnmNPXLah69CR5cb.jpg' // Standard Prime Video logo path
                };
                this.allProviders.push(manualPrimeVideo);
              }
            }
            
            // Get popular providers based on our predefined list
            this.popularProviders = this.allProviders
              .filter((provider: any) => this.popularProviderIds.includes(provider.provider_id))
              .sort((a: any, b: any) => {
                const indexA = this.popularProviderIds.indexOf(a.provider_id);
                const indexB = this.popularProviderIds.indexOf(b.provider_id);
                return indexA - indexB; // Sort by position in popularity array
              });
              
            // Log the IDs of providers in the popular list
            console.log('Popular providers IDs:', this.popularProviders.map(p => p.provider_id));
              
            // Ensure we have arrays even if filtering returns empty results
            if (!this.allProviders) this.allProviders = [];
            if (!this.popularProviders) this.popularProviders = [];
            
            // By default, show only popular providers
            this.providers = this.showAllProviders ? this.allProviders : this.popularProviders;
            
            // Log provider information for debugging
            console.log(`Found ${this.allProviders.length} total providers available in France`);
            console.log(`Found ${this.popularProviders.length} popular providers`);
            console.log('Currently displayed providers:', this.providers.map((p: any) => `${p.provider_name} (ID: ${p.provider_id})`));
            
            this.loading = false;
          },
          error: (err: any) => {
            console.error('Error loading France providers:', err);
            this.error = 'Failed to load streaming platforms for France';
            this.loading = false;
          }
        });
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
      // Add platform
      this.selectedPlatforms.push(providerId);
    } else {
      // Remove platform
      this.selectedPlatforms.splice(index, 1);
    }
    
    // Save to localStorage
    localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
    
    this.platformsChange.emit([...this.selectedPlatforms]);
  }

  isPlatformSelected(providerId: number): boolean {
    return this.selectedPlatforms.includes(providerId);
  }
  
  clearAll(): void {
    this.selectedPlatforms = [];
    // Save to localStorage
    localStorage.setItem('selectedPlatforms', JSON.stringify(this.selectedPlatforms));
    this.platformsChange.emit(this.selectedPlatforms);
  }
  
  toggleShowAllProviders(): void {
    this.showAllProviders = !this.showAllProviders;
    this.providers = this.showAllProviders ? this.allProviders : this.popularProviders;
  }
}
