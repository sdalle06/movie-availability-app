import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MovieService } from './movie.service';
import { WatchlistItem, WatchProvider } from '../models/tmdb.models';

const STORAGE_KEY = 'watchlist';
/** Don't re-query TMDB for an item checked more recently than this. */
const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours
/** Availability is evaluated for the user's home region. */
const HOME_REGION = 'FR';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private movieService = inject(MovieService);

  private readonly _items = signal<WatchlistItem[]>(this.load());

  /** Reactive list of watchlist items, newest first. */
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  private load(): WatchlistItem[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  private persist(items: WatchlistItem[]): void {
    this._items.set(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  isInList(id: number, mediaType: 'movie' | 'tv'): boolean {
    return this._items().some(i => i.id === id && i.mediaType === mediaType);
  }

  add(item: Omit<WatchlistItem, 'addedAt' | 'available' | 'lastChecked' | 'notifiedAvailable'> & Partial<WatchlistItem>): void {
    if (this.isInList(item.id, item.mediaType)) {
      return;
    }
    const entry: WatchlistItem = {
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      posterPath: item.posterPath ?? null,
      addedAt: Date.now(),
      available: item.available ?? false,
      lastChecked: item.lastChecked ?? 0,
      notifiedAvailable: item.notifiedAvailable ?? false
    };
    this.persist([entry, ...this._items()]);
  }

  remove(id: number, mediaType: 'movie' | 'tv'): void {
    this.persist(this._items().filter(i => !(i.id === id && i.mediaType === mediaType)));
  }

  toggle(item: Omit<WatchlistItem, 'addedAt' | 'available' | 'lastChecked' | 'notifiedAvailable'> & Partial<WatchlistItem>): void {
    if (this.isInList(item.id, item.mediaType)) {
      this.remove(item.id, item.mediaType);
    } else {
      this.add(item);
    }
  }

  clear(): void {
    this.persist([]);
  }

  /**
   * Re-checks availability for every watchlist item on the user's selected
   * platforms (home region). Items checked within the throttle window are
   * skipped. Resolves to the items that newly flipped from unavailable to
   * available and had not yet been notified — those are marked notified so
   * subsequent checks don't alert again.
   */
  checkAvailability(selectedPlatforms: number[]): Observable<WatchlistItem[]> {
    const items = this._items();
    if (items.length === 0 || selectedPlatforms.length === 0) {
      return of([]);
    }

    const now = Date.now();
    const toCheck = items.filter(i => now - i.lastChecked >= CHECK_THROTTLE_MS);
    if (toCheck.length === 0) {
      return of([]);
    }

    const calls = toCheck.map(item => {
      const providers$ = item.mediaType === 'movie'
        ? this.movieService.getMovieWatchProviders(item.id)
        : this.movieService.getTVWatchProviders(item.id);
      return providers$.pipe(
        map(response => ({
          item,
          available: this.isAvailableOnPlatforms(response.results?.[HOME_REGION], selectedPlatforms)
        })),
        catchError(() => of({ item, available: item.available }))
      );
    });

    return forkJoin(calls).pipe(
      map(results => {
        const flippedToAvailable: WatchlistItem[] = [];
        const byId = new Map(results.map(r => [`${r.item.mediaType}:${r.item.id}`, r]));

        const updated = this._items().map(existing => {
          const result = byId.get(`${existing.mediaType}:${existing.id}`);
          if (!result) {
            return existing;
          }
          const becameAvailable = result.available && !existing.available;
          const next: WatchlistItem = {
            ...existing,
            available: result.available,
            lastChecked: now,
            notifiedAvailable: existing.notifiedAvailable || (becameAvailable ? true : existing.notifiedAvailable)
          };
          if (becameAvailable && !existing.notifiedAvailable) {
            flippedToAvailable.push(next);
          }
          return next;
        });

        this.persist(updated);
        return flippedToAvailable;
      })
    );
  }

  private isAvailableOnPlatforms(
    countryProviders: { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] } | undefined,
    selectedPlatforms: number[]
  ): boolean {
    if (!countryProviders) {
      return false;
    }
    const all: WatchProvider[] = [
      ...(countryProviders.flatrate || []),
      ...(countryProviders.rent || []),
      ...(countryProviders.buy || [])
    ];
    return all.some(p => selectedPlatforms.includes(p.provider_id));
  }
}
