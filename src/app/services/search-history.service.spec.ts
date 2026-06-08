import { TestBed } from '@angular/core/testing';

import { SearchHistoryService } from './search-history.service';
import { SearchHistoryEntry } from '../models/tmdb.models';

const STORAGE_KEY = 'searchHistory';

function createService(): SearchHistoryService {
  TestBed.configureTestingModule({ providers: [SearchHistoryService] });
  return TestBed.inject(SearchHistoryService);
}

describe('SearchHistoryService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(createService().entries()).toEqual([]);
  });

  it('loads existing entries from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ query: 'dune', contentType: 'movie', at: 1 }]));
    expect(createService().entries().length).toBe(1);
  });

  it('recovers from corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    const service = createService();
    expect(service.entries()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('adds an entry to the front and persists', () => {
    const service = createService();
    service.add('dune', 'movie');
    service.add('matrix', 'multi');
    const entries = service.entries();
    expect(entries[0].query).toBe('matrix');
    expect(entries.length).toBe(2);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).length).toBe(2);
  });

  it('ignores blank queries', () => {
    const service = createService();
    service.add('   ', 'movie');
    expect(service.entries()).toEqual([]);
  });

  it('trims the stored query', () => {
    const service = createService();
    service.add('  dune  ', 'movie');
    expect(service.entries()[0].query).toBe('dune');
  });

  it('dedupes same query+type (case-insensitive) and moves it to front', () => {
    const service = createService();
    service.add('Dune', 'movie');
    service.add('matrix', 'movie');
    service.add('dune', 'movie'); // duplicate of first, different case
    const entries = service.entries();
    expect(entries.length).toBe(2);
    expect(entries[0].query).toBe('dune');
  });

  it('treats same query with different content type as distinct', () => {
    const service = createService();
    service.add('dune', 'movie');
    service.add('dune', 'tv');
    expect(service.entries().length).toBe(2);
  });

  it('caps the list at 15 entries', () => {
    const service = createService();
    for (let i = 0; i < 20; i++) {
      service.add(`q${i}`, 'multi');
    }
    expect(service.entries().length).toBe(15);
    expect(service.entries()[0].query).toBe('q19'); // newest kept
  });

  it('removes a matching entry', () => {
    const service = createService();
    service.add('dune', 'movie');
    service.add('matrix', 'movie');
    const target: SearchHistoryEntry = { query: 'dune', contentType: 'movie', at: 0 };
    service.remove(target);
    expect(service.entries().length).toBe(1);
    expect(service.entries()[0].query).toBe('matrix');
  });

  it('clears all entries', () => {
    const service = createService();
    service.add('dune', 'movie');
    service.clear();
    expect(service.entries()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  });
});
