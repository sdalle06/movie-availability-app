import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HeaderComponent } from './components/header/header.component';
import { WatchlistService } from './services/watchlist.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, MatSnackBarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Movie Availability App';

  private watchlistService = inject(WatchlistService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.checkWatchlistAvailability();
  }

  /**
   * On app open, re-check whether any tracked-but-unavailable watchlist items
   * have started streaming on the user's selected platforms. This is the
   * closest thing to a "notification" possible in a backendless SPA.
   */
  private checkWatchlistAvailability(): void {
    const selectedPlatforms = this.readSelectedPlatforms();
    if (this.watchlistService.count() === 0 || selectedPlatforms.length === 0) {
      return;
    }

    this.watchlistService.checkAvailability(selectedPlatforms).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(nowAvailable => {
      if (nowAvailable.length > 0) {
        const count = nowAvailable.length;
        const label = count === 1 ? 'title' : 'titles';
        this.snackBar.open(
          `${count} watchlist ${label} now streaming on your platforms`,
          'View',
          { duration: 6000 }
        );
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
}
