import { Component, DestroyRef, ElementRef, inject, OnInit, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MovieService } from '../../services/movie.service';
import { SearchResultItem } from '../../models/tmdb.models';
import { MovieCardComponent } from '../movie-card/movie-card.component';

const REGIONS = ['FR', 'CA', 'US'];
const MAX_ITEMS = 20;
const RECENT_MONTHS = 6;

@Component({
  selector: 'app-inspiration',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MovieCardComponent
  ],
  templateUrl: './inspiration.component.html',
  styleUrls: ['./inspiration.component.scss']
})
export class InspirationComponent implements OnInit {
  @ViewChildren('carouselContainer') carouselContainers!: QueryList<ElementRef<HTMLElement>>;

  contentType: 'movie' | 'tv' = 'movie';
  loading = false;
  error = '';
  selectedPlatforms: number[] = [];

  popularItems: SearchResultItem[] = [];
  recentItems: SearchResultItem[] = [];

  private destroyRef = inject(DestroyRef);

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.loadPlatforms();
    this.loadContent();
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

  private get dateLteKey(): string {
    return this.contentType === 'movie'
      ? 'primary_release_date.lte'
      : 'first_air_date.lte';
  }

  private get dateGteKey(): string {
    return this.contentType === 'movie'
      ? 'primary_release_date.gte'
      : 'first_air_date.gte';
  }

  onContentTypeChange(type: 'movie' | 'tv'): void {
    this.contentType = type;
    this.popularItems = [];
    this.recentItems = [];
    this.loadContent();
  }

  loadContent(): void {
    if (!this.hasPlatforms) {
      return;
    }

    this.loading = true;
    this.error = '';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthsAgo = new Date(now.getFullYear(), now.getMonth() - RECENT_MONTHS, now.getDate())
      .toISOString().split('T')[0];

    const calls: Record<string, ReturnType<MovieService['discover']>> = {};

    for (const region of REGIONS) {
      calls[`popular_${region}`] = this.movieService.discover(
        this.contentType, this.selectedPlatforms, region, 'popularity.desc'
      );
      // "Recently Released" = popular within the last 6 months
      calls[`recent_${region}`] = this.movieService.discover(
        this.contentType, this.selectedPlatforms, region, 'popularity.desc',
        { [this.dateGteKey]: monthsAgo, [this.dateLteKey]: today }
      );
    }

    forkJoin(calls).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        this.popularItems = this.mergeResults(
          REGIONS.map(r => (results[`popular_${r}`].results || []))
        );
        this.recentItems = this.mergeResults(
          REGIONS.map(r => (results[`recent_${r}`].results || []))
        );
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load content. Please try again.';
        this.loading = false;
      }
    });
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
        if (merged.length >= MAX_ITEMS) {
          return merged;
        }
      }
    }

    return merged;
  }

  scrollCarousel(index: number, direction: 'left' | 'right'): void {
    const containers = this.carouselContainers?.toArray();
    if (!containers || !containers[index]) return;

    const el = containers[index].nativeElement;
    const scrollAmount = 600;
    el.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }
}
