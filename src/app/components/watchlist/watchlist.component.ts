import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WatchlistService } from '../../services/watchlist.service';
import { WatchlistItem } from '../../models/tmdb.models';

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
      next: (nowAvailable) => {
        this.checking = false;
        if (nowAvailable.length > 0) {
          const names = nowAvailable.map(i => i.title).join(', ');
          this.snackBar.open(
            `Now streaming on your platforms: ${names}`,
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
