import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MovieService } from '../../services/movie.service';
import { SearchResultItem } from '../../models/tmdb.models';
import { MovieCardComponent } from '../movie-card/movie-card.component';

const REGIONS = ['FR', 'CA', 'US'];
const PAGE_SIZE = 20;
const RECENT_MONTHS = 6;

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MovieCardComponent
  ],
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.scss']
})
export class BrowseComponent implements OnInit {
  contentType: 'movie' | 'tv' = 'movie';
  sortBy = 'popularity.desc';
  minRating = 0;
  currentPage = 1;
  loading = false;
  loadingMore = false;
  error = '';
  hasMore = true;
  selectedPlatforms: number[] = [];
  items: SearchResultItem[] = [];

  sortOptions: SortOption[] = [];
  ratingOptions = [
    { label: 'Any Rating', value: 0 },
    { label: '5+', value: 5 },
    { label: '6+', value: 6 },
    { label: '7+', value: 7 },
    { label: '8+', value: 8 }
  ];

  private destroyRef = inject(DestroyRef);

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPlatforms();
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      if (params['type'] === 'movie' || params['type'] === 'tv') {
        this.contentType = params['type'];
      }
      if (params['sort']) {
        this.sortBy = params['sort'];
      }
      this.buildSortOptions();
      this.resetAndLoad();
    });
  }

  private loadPlatforms(): void {
    const stored = localStorage.getItem('selectedPlatforms');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.selectedPlatforms = parsed;
        }
      } catch {
        this.selectedPlatforms = [];
      }
    }
  }

  get hasPlatforms(): boolean {
    return this.selectedPlatforms.length > 0;
  }

  get pageTitle(): string {
    const typeLabel = this.contentType === 'movie' ? 'Movies' : 'TV Shows';
    if (this.sortBy === 'popular_recent') return `Popular & Recent ${typeLabel}`;
    if (this.sortBy.startsWith('popularity')) return `Popular ${typeLabel}`;
    if (this.sortBy.startsWith('vote_average')) return `Highest Rated ${typeLabel}`;
    if (this.sortBy.includes('release_date.desc') || this.sortBy.includes('air_date.desc')) return `Recently Released ${typeLabel}`;
    if (this.sortBy.includes('release_date.asc') || this.sortBy.includes('air_date.asc')) return `Oldest ${typeLabel}`;
    return `Browse ${typeLabel}`;
  }

  private get dateSortDesc(): string {
    return this.contentType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
  }

  private get dateSortAsc(): string {
    return this.contentType === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc';
  }

  private get dateLteKey(): string {
    return this.contentType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
  }

  private get dateGteKey(): string {
    return this.contentType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
  }

  private buildSortOptions(): void {
    this.sortOptions = [
      { label: 'Most Popular', value: 'popularity.desc' },
      { label: 'Popular & Recent', value: 'popular_recent' },
      { label: 'Highest Rated', value: 'vote_average.desc' },
      { label: 'Newest First', value: this.dateSortDesc },
      { label: 'Oldest First', value: this.dateSortAsc }
    ];

    // Normalize the current sortBy to match computed options
    if (this.sortBy !== 'popular_recent') {
      if (this.sortBy.includes('release_date.desc') || this.sortBy.includes('air_date.desc')) {
        this.sortBy = this.dateSortDesc;
      } else if (this.sortBy.includes('release_date.asc') || this.sortBy.includes('air_date.asc')) {
        this.sortBy = this.dateSortAsc;
      }
    }
  }

  onSortChange(value: string): void {
    this.sortBy = value;
    this.resetAndLoad();
  }

  onRatingChange(value: number): void {
    this.minRating = value;
    this.resetAndLoad();
  }

  resetAndLoad(): void {
    this.items = [];
    this.currentPage = 1;
    this.hasMore = true;
    this.loadPage();
  }

  loadPage(): void {
    if (!this.hasPlatforms) return;

    const isFirstPage = this.currentPage === 1;
    if (isFirstPage) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }
    this.error = '';

    const extraParams: Record<string, string> = {
      page: String(this.currentPage)
    };

    // Determine the actual TMDB sort field
    let apiSort = this.sortBy;

    if (this.sortBy === 'popular_recent') {
      // Sort by popularity but constrain to last N months
      apiSort = 'popularity.desc';
      const now = new Date();
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - RECENT_MONTHS, now.getDate())
        .toISOString().split('T')[0];
      extraParams[this.dateGteKey] = monthsAgo;
      extraParams[this.dateLteKey] = now.toISOString().split('T')[0];
    } else if (this.sortBy.includes('.desc') && (this.sortBy.includes('release_date') || this.sortBy.includes('air_date'))) {
      // Add date ceiling for date-descending sorts
      extraParams[this.dateLteKey] = new Date().toISOString().split('T')[0];
    }

    if (this.minRating > 0) {
      extraParams['vote_average.gte'] = String(this.minRating);
    }

    const calls = REGIONS.map(region =>
      this.movieService.discover(this.contentType, this.selectedPlatforms, region, apiSort, extraParams)
    );

    forkJoin(calls).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        const regionArrays = results.map(r => (r.results || []));
        const newItems = this.mergeResults(regionArrays);

        if (isFirstPage) {
          this.items = newItems;
        } else {
          // Append while deduplicating against existing
          const existingIds = new Set(this.items.map(i => i.id));
          for (const item of newItems) {
            if (!existingIds.has(item.id)) {
              this.items.push(item);
              existingIds.add(item.id);
            }
          }
        }

        // Check if any region still has more pages
        this.hasMore = results.some(r => r.page < r.total_pages);
        this.loading = false;
        this.loadingMore = false;
      },
      error: () => {
        this.error = 'Failed to load content. Please try again.';
        this.loading = false;
        this.loadingMore = false;
      }
    });
  }

  loadMore(): void {
    this.currentPage++;
    this.loadPage();
  }

  private mergeResults(regionArrays: SearchResultItem[][]): SearchResultItem[] {
    const seen = new Set<number>();
    const merged: SearchResultItem[] = [];

    for (const items of regionArrays) {
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push({ ...item, media_type: this.contentType } as SearchResultItem);
        }
        if (merged.length >= PAGE_SIZE) {
          return merged;
        }
      }
    }

    return merged;
  }
}
