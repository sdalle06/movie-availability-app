import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, timeout, catchError } from 'rxjs/operators';

interface WikidataCache {
  ids: number[];
  timestamp: number;
}

interface SparqlResponse {
  results: {
    bindings: Array<{ tmdb: { value: string } }>;
  };
}

const CACHE_KEY = 'cannesWikidataCache';
const CACHE_TTL = 86400000; // 24 hours

const CANNES_SPARQL = `SELECT DISTINCT ?tmdb WHERE {
  ?film wdt:P4947 ?tmdb .
  {
    ?film wdt:P166 ?award .
    ?award wdt:P361 wd:Q42369
  } UNION {
    ?film wdt:P1411 ?award .
    ?award wdt:P361 wd:Q42369
  } UNION {
    ?film wdt:P1344 ?event .
    ?event wdt:P361 wd:Q42369
  }
}`;

@Injectable({
  providedIn: 'root'
})
export class WikidataService {
  constructor(private http: HttpClient) {}

  getCannesFilmIds(): Observable<number[]> {
    const cached = this.readCache();
    if (cached) {
      return of(cached);
    }

    return this.http.get<SparqlResponse>('https://query.wikidata.org/sparql', {
      params: { query: CANNES_SPARQL, format: 'json' },
      headers: { 'Accept': 'application/sparql-results+json' }
    }).pipe(
      timeout(5000),
      map(response => response.results.bindings
        .map(b => Number(b.tmdb.value))
        .filter(id => !isNaN(id) && id > 0)
      ),
      tap(ids => this.writeCache(ids)),
      catchError(() => of([]))
    );
  }

  private readCache(): number[] | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cache: WikidataCache = JSON.parse(raw);
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.ids;
      }
      return null;
    } catch {
      return null;
    }
  }

  private writeCache(ids: number[]): void {
    const cache: WikidataCache = { ids, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }
}
