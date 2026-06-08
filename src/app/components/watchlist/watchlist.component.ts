import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WatchlistService } from '../../services/watchlist.service';
import { isHomeRegion, isPreferredRegion, isUsableRegion, regionRank } from '../../utils/region.util';
import { WatchlistItem } from '../../models/tmdb.models';

/** Max usable-region flags to show on a card before collapsing to "+N more". */
const MAX_FLAGS = 6;

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.scss']
})
export class WatchlistComponent implements OnInit {
  private watchlistService = inject(WatchlistService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  readonly items = this.watchlistService.items;
  checking = false;

  private imageBaseUrl = 'https://image.tmdb.org/t/p/';
  private posterSize = 'w500';

  ngOnInit(): void {
    const selectedPlatforms = this.readSelectedPlatforms();
    if (this.items().length === 0 || selectedPlatforms.length === 0) {
      return;
    }

    this.checking = true;
    this.watchlistService.checkAvailability(selectedPlatforms).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (gainedOffers) => {
        this.checking = false;
        if (gainedOffers.length > 0) {
          const names = gainedOffers.map(i => i.title).join(', ');
          this.snackBar.open(
            `New availability for: ${names}`,
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: () => {
        this.checking = false;
      }
    });
  }

  private readSelectedPlatforms(): number[] {
    const stored = localStorage.getItem('selectedPlatforms');
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  detailLink(item: WatchlistItem): string[] {
    return item.mediaType === 'tv' ? ['/tv', String(item.id)] : ['/movies', String(item.id)];
  }

  /**
   * Whether the item is watchable for the user, derived live from its offers
   * rather than the persisted `available` flag — so the badge can never
   * contradict the flags shown, even if the stored flag is stale.
   */
  isAvailable(item: WatchlistItem): boolean {
    return this.usableRegions(item).length > 0;
  }

  /** All distinct country codes where the item currently streams. */
  regions(item: WatchlistItem): string[] {
    const codes = new Set(item.offers.map(o => o.split(':')[0]));
    return Array.from(codes).sort();
  }

  /**
   * Usable regions the item streams in (France first, then VPN-reachable
   * non-EU countries). EU/EEA-except-France is excluded — portability makes
   * those unwatchable from France.
   */
  usableRegions(item: WatchlistItem): string[] {
    return this.regions(item)
      .filter(isUsableRegion)
      .sort((a, b) => regionRank(a) - regionRank(b) || a.localeCompare(b));
  }

  /** Count of EU/EEA-except-France regions (shown streaming but locked to FR). */
  lockedRegionCount(item: WatchlistItem): number {
    return this.regions(item).filter(c => !isUsableRegion(c)).length;
  }

  /** Usable-region flags to render, capped so ubiquitous titles stay compact. */
  displayedRegions(item: WatchlistItem): string[] {
    return this.usableRegions(item).slice(0, MAX_FLAGS);
  }

  /** How many usable regions are hidden beyond the cap. */
  extraRegionCount(item: WatchlistItem): number {
    return Math.max(0, this.usableRegions(item).length - MAX_FLAGS);
  }

  isHome(countryCode: string): boolean {
    return isHomeRegion(countryCode);
  }

  isPreferred(countryCode: string): boolean {
    return isPreferredRegion(countryCode);
  }

  hasNewOffers(item: WatchlistItem): boolean {
    return item.newOffers.length > 0;
  }

  /** Country codes that appeared since the last check. */
  newRegions(item: WatchlistItem): string[] {
    const codes = new Set(item.newOffers.map(o => o.split(':')[0]));
    return Array.from(codes).sort();
  }

  flagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  getPosterPath(posterPath: string | null): string {
    if (posterPath) {
      return `${this.imageBaseUrl}${this.posterSize}${posterPath}`;
    }
    return 'assets/no-image.png';
  }

  remove(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.watchlistService.remove(item.id, item.mediaType);
  }

  clearAll(): void {
    this.watchlistService.clear();
  }

  trackById(_index: number, item: WatchlistItem): string {
    return `${item.mediaType}:${item.id}`;
  }
}
