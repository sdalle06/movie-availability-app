import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { WatchlistService } from './watchlist.service';
import { MovieService } from './movie.service';
import { environment } from '../../environments/environment';
import { WatchlistItem } from '../models/tmdb.models';

const apiUrl = environment.apiUrl;
const STORAGE_KEY = 'watchlist';

function makeItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 1,
    mediaType: 'movie',
    title: 'Test Movie',
    posterPath: '/p.jpg',
    addedAt: 1000,
    available: false,
    lastChecked: 0,
    notifiedAvailable: false,
    ...overrides
  };
}

/** Creates the service after localStorage has been seeded, so load() sees it. */
function createService(): { service: WatchlistService; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [WatchlistService, MovieService]
  });
  return {
    service: TestBed.inject(WatchlistService),
    httpMock: TestBed.inject(HttpTestingController)
  };
}

describe('WatchlistService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts empty when no storage', () => {
    const { service } = createService();
    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('loads existing items from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem()]));
    const { service } = createService();
    expect(service.items().length).toBe(1);
    expect(service.count()).toBe(1);
  });

  it('recovers from corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid');
    const { service } = createService();
    expect(service.items()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  describe('add / remove / toggle', () => {
    it('adds a new item at the front and persists', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A', posterPath: null });
      service.add({ id: 6, mediaType: 'tv', title: 'B', posterPath: null });

      const items = service.items();
      expect(items.length).toBe(2);
      expect(items[0].id).toBe(6); // newest first
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).length).toBe(2);
    });

    it('does not add duplicates of the same id+mediaType', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A', posterPath: null });
      service.add({ id: 5, mediaType: 'movie', title: 'A again', posterPath: null });
      expect(service.count()).toBe(1);
    });

    it('treats movie and tv with same id as distinct', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A', posterPath: null });
      service.add({ id: 5, mediaType: 'tv', title: 'A show', posterPath: null });
      expect(service.count()).toBe(2);
    });

    it('isInList reflects membership', () => {
      const { service } = createService();
      expect(service.isInList(5, 'movie')).toBe(false);
      service.add({ id: 5, mediaType: 'movie', title: 'A', posterPath: null });
      expect(service.isInList(5, 'movie')).toBe(true);
      expect(service.isInList(5, 'tv')).toBe(false);
    });

    it('removes an item', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A', posterPath: null });
      service.remove(5, 'movie');
      expect(service.count()).toBe(0);
    });

    it('toggle adds then removes', () => {
      const { service } = createService();
      const payload = { id: 5, mediaType: 'movie' as const, title: 'A', posterPath: null };
      service.toggle(payload);
      expect(service.isInList(5, 'movie')).toBe(true);
      service.toggle(payload);
      expect(service.isInList(5, 'movie')).toBe(false);
    });

    it('clear empties the list', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A', posterPath: null });
      service.clear();
      expect(service.count()).toBe(0);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
    });
  });

  describe('checkAvailability', () => {
    it('is a no-op (no HTTP) when watchlist empty', () => {
      const { service, httpMock } = createService();
      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([8]).subscribe(r => (emitted = r));
      httpMock.verify(); // no outstanding requests
      expect(emitted).toEqual([]);
    });

    it('is a no-op when no platforms selected', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem()]));
      const { service, httpMock } = createService();
      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([]).subscribe(r => (emitted = r));
      httpMock.verify();
      expect(emitted).toEqual([]);
    });

    it('detects an item that flipped to available and reports it once', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, available: false, lastChecked: 0, notifiedAvailable: false })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      const req = httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`);
      req.flush({ id: 10, results: { FR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' }] } } });

      expect(emitted.length).toBe(1);
      expect(emitted[0].id).toBe(10);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].available).toBe(true);
      expect(stored[0].notifiedAvailable).toBe(true);
      expect(stored[0].lastChecked).toBeGreaterThan(0);
    });

    it('does not re-notify an already-notified available item', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, available: true, lastChecked: 0, notifiedAvailable: true })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      const req = httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`);
      req.flush({ id: 10, results: { FR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' }] } } });

      expect(emitted.length).toBe(0);
    });

    it('reports nothing when item is not on selected platforms', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem({ id: 10 })]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      const req = httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`);
      req.flush({ id: 10, results: { FR: { flatrate: [{ provider_id: 999, provider_name: 'Other', logo_path: '/o.jpg' }] } } });

      expect(emitted.length).toBe(0);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].available).toBe(false);
    });

    it('skips items checked within the throttle window', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, lastChecked: Date.now() })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([8]).subscribe(r => (emitted = r));
      httpMock.verify(); // nothing requested
      expect(emitted).toEqual([]);
    });

    it('uses the tv endpoint for tv items', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 20, mediaType: 'tv' })
      ]));
      const { service, httpMock } = createService();

      service.checkAvailability([8]).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/tv/20/watch/providers?api_key=${environment.apiKey}`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 20, results: {} });
    });

    it('survives an API error for one item', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem({ id: 10 })]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      const req = httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`);
      req.flush('error', { status: 500, statusText: 'Server Error' });

      expect(emitted).toEqual([]);
    });
  });
});
