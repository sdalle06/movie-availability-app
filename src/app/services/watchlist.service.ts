import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MovieService } from './movie.service';
import { isUsableRegion } from '../utils/region.util';
import { CountryWatchProviders, WatchProvider, WatchlistItem } from '../models/tmdb.models';

const STORAGE_KEY = 'watchlist';
/** Don't re-query TMDB for an item checked more recently than this. */
const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

type AddPayload =
  Pick<WatchlistItem, 'id' | 'mediaType' | 'title'> &
  Partial<Pick<WatchlistItem, 'posterPath'>> &
  { providers?: Record<string, CountryWatchProviders>; selectedPlatforms?: number[] };

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
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Tolerate items saved before offer-tracking existed. If an item has no
      // offers recorded, reset lastChecked to 0 so the next check re-populates
      // it once (instead of being stuck behind the throttle).
      return parsed.map((i: Partial<WatchlistItem>) => {
        const offers = Array.isArray(i.offers) ? i.offers : [];
        return {
          ...i,
          offers,
          newOffers: Array.isArray(i.newOffers) ? i.newOffers : [],
          lastChecked: offers.length === 0 ? 0 : (i.lastChecked ?? 0)
        };
      }) as WatchlistItem[];
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

  add(item: AddPayload): void {
    if (this.isInList(item.id, item.mediaType)) {
      return;
    }
    // Seed the offer baseline from the detail page's provider data when present,
    // so offers already streaming at add-time are NOT later flagged as "new".
    const offers = item.providers
      ? this.extractOffers(item.providers, item.selectedPlatforms ?? [])
      : [];
    const now = Date.now();
    const entry: WatchlistItem = {
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      posterPath: item.posterPath ?? null,
      addedAt: now,
      available: this.hasUsableOffer(offers),
      offers,
      newOffers: [],
      // Only treat as "checked" if we actually captured offer data; otherwise
      // leave it 0 so the next checkAvailability populates it immediately.
      lastChecked: offers.length > 0 ? now : 0
    };
    this.persist([entry, ...this._items()]);
  }

  remove(id: number, mediaType: 'movie' | 'tv'): void {
    this.persist(this._items().filter(i => !(i.id === id && i.mediaType === mediaType)));
  }

  toggle(item: AddPayload): void {
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
   * Re-checks every watchlist item against the user's selected platforms across
   * all countries. Items checked within the throttle window are skipped.
   * Updates each item's offer set, the usable-region `available` flag, and the
   * `newOffers` delta (offers that appeared since the last known set). Resolves
   * to the items that gained at least one new offer, so the caller can notify.
   */
  checkAvailability(selectedPlatforms: number[]): Observable<WatchlistItem[]> {
    const items = this._items();
    if (items.length === 0 || selectedPlatforms.length === 0) {
      return of([]);
    }

    const now = Date.now();
    // Always re-check items that have no offers recorded yet (e.g. added before
    // offer-tracking, or added without provider data); otherwise honour the
    // throttle so we don't hammer the API on every open.
    const toCheck = items.filter(
      i => i.offers.length === 0 || now - i.lastChecked >= CHECK_THROTTLE_MS
    );
    if (toCheck.length === 0) {
      return of([]);
    }

    const calls = toCheck.map(item => {
      const providers$ = item.mediaType === 'movie'
        ? this.movieService.getMovieWatchProviders(item.id)
        : this.movieService.getTVWatchProviders(item.id);
      return providers$.pipe(
        map(response => ({ item, offers: this.extractOffers(response.results ?? {}, selectedPlatforms) })),
        // On error keep the previously-known offers so nothing is falsely lost.
        catchError(() => of({ item, offers: item.offers }))
      );
    });

    return forkJoin(calls).pipe(
      map(results => {
        const gainedOffers: WatchlistItem[] = [];
        const byKey = new Map(results.map(r => [`${r.item.mediaType}:${r.item.id}`, r]));

        const updated = this._items().map(existing => {
          const result = byKey.get(`${existing.mediaType}:${existing.id}`);
          if (!result) {
            return existing;
          }
          const prev = new Set(existing.offers);
          const newOffers = result.offers.filter(o => !prev.has(o));
          const next: WatchlistItem = {
            ...existing,
            offers: result.offers,
            newOffers,
            available: this.hasUsableOffer(result.offers),
            lastChecked: now
          };
          if (newOffers.length > 0) {
            gainedOffers.push(next);
          }
          return next;
        });

        this.persist(updated);
        return gainedOffers;
      })
    );
  }

  /** Builds sorted 'COUNTRY:providerId' keys for the selected platforms, all countries. */
  private extractOffers(
    results: Record<string, CountryWatchProviders>,
    selectedPlatforms: number[]
  ): string[] {
    const offers: string[] = [];
    for (const [country, data] of Object.entries(results)) {
      const providers: WatchProvider[] = [
        ...(data.flatrate || []),
        ...(data.rent || []),
        ...(data.buy || [])
      ];
      for (const p of providers) {
        if (selectedPlatforms.includes(p.provider_id)) {
          const key = `${country}:${p.provider_id}`;
          if (!offers.includes(key)) {
            offers.push(key);
          }
        }
      }
    }
    return offers.sort();
  }

  /** True when any offer is in a region the household can actually watch. */
  private hasUsableOffer(offers: string[]): boolean {
    return offers.some(o => isUsableRegion(o.split(':')[0]));
  }
}
