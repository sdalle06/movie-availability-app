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
    offers: [],
    newOffers: [],
    lastChecked: 0,
    ...overrides
  };
}

function provider(id: number) {
  return { provider_id: id, provider_name: `P${id}`, logo_path: '/l.jpg' };
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
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts empty when no storage', () => {
    const { service } = createService();
    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('loads existing items from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem()]));
    const { service } = createService();
    expect(service.items().length).toBe(1);
  });

  it('backfills offers/newOffers for items saved before offer-tracking', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 1, mediaType: 'movie', title: 'Old', posterPath: null, addedAt: 1, available: false, lastChecked: 1 }
    ]));
    const { service } = createService();
    expect(service.items()[0].offers).toEqual([]);
    expect(service.items()[0].newOffers).toEqual([]);
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
      service.add({ id: 5, mediaType: 'movie', title: 'A' });
      service.add({ id: 6, mediaType: 'tv', title: 'B' });

      const items = service.items();
      expect(items.length).toBe(2);
      expect(items[0].id).toBe(6);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).length).toBe(2);
    });

    it('seeds the offer baseline and usable availability from provider data on add', () => {
      const { service } = createService();
      service.add({
        id: 5, mediaType: 'movie', title: 'A',
        selectedPlatforms: [8],
        providers: {
          FR: { flatrate: [provider(8)] },
          KR: { flatrate: [provider(8)] }
        }
      });
      const item = service.items()[0];
      expect(item.offers).toEqual(['FR:8', 'KR:8']);
      expect(item.available).toBeTrue(); // FR is usable
      expect(item.newOffers).toEqual([]); // nothing is "new" at add time
    });

    it('treats a Korea-only title as available (non-EU, VPN-reachable)', () => {
      const { service } = createService();
      service.add({
        id: 5, mediaType: 'movie', title: 'No Other Choice',
        selectedPlatforms: [8],
        providers: { KR: { flatrate: [provider(8)] } }
      });
      const item = service.items()[0];
      expect(item.offers).toEqual(['KR:8']);
      expect(item.available).toBeTrue(); // KR is reachable via VPN
    });

    it('treats an EU-only (non-France) title as NOT available (portability-locked)', () => {
      const { service } = createService();
      service.add({
        id: 6, mediaType: 'movie', title: 'German only',
        selectedPlatforms: [8],
        providers: { DE: { flatrate: [provider(8)] }, ES: { flatrate: [provider(8)] } }
      });
      const item = service.items()[0];
      expect(item.offers).toEqual(['DE:8', 'ES:8']);
      expect(item.available).toBeFalse(); // EU-non-FR is unreachable from France
    });

    it('does not add duplicates of the same id+mediaType', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A' });
      service.add({ id: 5, mediaType: 'movie', title: 'A again' });
      expect(service.count()).toBe(1);
    });

    it('treats movie and tv with same id as distinct', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A' });
      service.add({ id: 5, mediaType: 'tv', title: 'A show' });
      expect(service.count()).toBe(2);
    });

    it('isInList reflects membership', () => {
      const { service } = createService();
      expect(service.isInList(5, 'movie')).toBeFalse();
      service.add({ id: 5, mediaType: 'movie', title: 'A' });
      expect(service.isInList(5, 'movie')).toBeTrue();
      expect(service.isInList(5, 'tv')).toBeFalse();
    });

    it('removes an item', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A' });
      service.remove(5, 'movie');
      expect(service.count()).toBe(0);
    });

    it('toggle adds then removes', () => {
      const { service } = createService();
      const payload = { id: 5, mediaType: 'movie' as const, title: 'A' };
      service.toggle(payload);
      expect(service.isInList(5, 'movie')).toBeTrue();
      service.toggle(payload);
      expect(service.isInList(5, 'movie')).toBeFalse();
    });

    it('clear empties the list', () => {
      const { service } = createService();
      service.add({ id: 5, mediaType: 'movie', title: 'A' });
      service.clear();
      expect(service.count()).toBe(0);
    });
  });

  describe('checkAvailability', () => {
    it('is a no-op (no HTTP) when watchlist empty', () => {
      const { service, httpMock } = createService();
      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([8]).subscribe(r => (emitted = r));
      httpMock.verify();
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

    it('detects a new offer and reports the item', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, offers: [], lastChecked: 0 })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      const req = httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`);
      req.flush({ id: 10, results: { FR: { flatrate: [provider(8)] } } });

      expect(emitted.length).toBe(1);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].offers).toEqual(['FR:8']);
      expect(stored[0].newOffers).toEqual(['FR:8']);
      expect(stored[0].available).toBeTrue();
      expect(stored[0].lastChecked).toBeGreaterThan(0);
    });

    it('reports any new country, and Korea counts as usable (VPN-reachable)', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, offers: [], lastChecked: 0 })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`)
        .flush({ id: 10, results: { KR: { flatrate: [provider(8)] } } });

      expect(emitted.length).toBe(1); // new offer is notified
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].newOffers).toEqual(['KR:8']);
      expect(stored[0].available).toBeTrue(); // KR is reachable via VPN
    });

    it('an EU-non-France-only new offer is reported but not marked available', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 11, offers: [], lastChecked: 0 })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      httpMock.expectOne(`${apiUrl}/movie/11/watch/providers?api_key=${environment.apiKey}`)
        .flush({ id: 11, results: { DE: { flatrate: [provider(8)] } } });

      expect(emitted.length).toBe(1);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].available).toBeFalse(); // DE is portability-locked
    });

    it('does not report when offers are unchanged since last check', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, offers: ['FR:8'], lastChecked: 0 })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`)
        .flush({ id: 10, results: { FR: { flatrate: [provider(8)] } } });

      expect(emitted.length).toBe(0);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].newOffers).toEqual([]);
    });

    it('ignores providers the user has not selected', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem({ id: 10 })]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] = [];
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`)
        .flush({ id: 10, results: { FR: { flatrate: [provider(999)] } } });

      expect(emitted.length).toBe(0);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].offers).toEqual([]);
    });

    it('skips items checked within the throttle window', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, offers: ['FR:8'], lastChecked: Date.now() })
      ]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([8]).subscribe(r => (emitted = r));
      httpMock.verify();
      expect(emitted).toEqual([]);
    });

    it('always re-checks an item with no offers, ignoring the throttle', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        makeItem({ id: 10, offers: [], lastChecked: Date.now() })
      ]));
      const { service, httpMock } = createService();

      service.checkAvailability([8]).subscribe();
      // Despite a fresh lastChecked, the empty-offer item is still queried.
      httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`)
        .flush({ id: 10, results: { KR: { flatrate: [provider(8)] } } });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].offers).toEqual(['KR:8']);
    });

    it('uses the tv endpoint for tv items', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem({ id: 20, mediaType: 'tv' })]));
      const { service, httpMock } = createService();

      service.checkAvailability([8]).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/tv/20/watch/providers?api_key=${environment.apiKey}`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 20, results: {} });
    });

    it('survives an API error for one item (keeps prior offers)', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem({ id: 10, offers: ['FR:8'] })]));
      const { service, httpMock } = createService();

      let emitted: WatchlistItem[] | undefined;
      service.checkAvailability([8]).subscribe(r => (emitted = r));

      httpMock.expectOne(`${apiUrl}/movie/10/watch/providers?api_key=${environment.apiKey}`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(emitted).toEqual([]);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as WatchlistItem[];
      expect(stored[0].offers).toEqual(['FR:8']);
    });
  });
});
