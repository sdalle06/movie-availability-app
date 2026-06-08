import { Injectable, signal } from '@angular/core';

import { SearchHistoryEntry } from '../models/tmdb.models';

const STORAGE_KEY = 'searchHistory';
const MAX_ENTRIES = 15;

@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
  private readonly _entries = signal<SearchHistoryEntry[]>(this.load());

  /** Reactive list of recent searches, most recent first. */
  readonly entries = this._entries.asReadonly();

  private load(): SearchHistoryEntry[] {
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

  private persist(entries: SearchHistoryEntry[]): void {
    this._entries.set(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  private static norm(query: string): string {
    return query.trim().toLowerCase();
  }

  /**
   * Records a search. Existing entries with the same query+contentType are
   * de-duplicated and moved to the front; the list is capped at MAX_ENTRIES.
   */
  add(query: string, contentType: string): void {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const key = SearchHistoryService.norm(trimmed);
    const withoutDupe = this._entries().filter(
      e => !(SearchHistoryService.norm(e.query) === key && e.contentType === contentType)
    );
    const entry: SearchHistoryEntry = { query: trimmed, contentType, at: Date.now() };
    this.persist([entry, ...withoutDupe].slice(0, MAX_ENTRIES));
  }

  remove(entry: SearchHistoryEntry): void {
    const key = SearchHistoryService.norm(entry.query);
    this.persist(this._entries().filter(
      e => !(SearchHistoryService.norm(e.query) === key && e.contentType === entry.contentType)
    ));
  }

  clear(): void {
    this.persist([]);
  }
}
