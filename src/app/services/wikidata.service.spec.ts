import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { WikidataService } from './wikidata.service';

describe('WikidataService', () => {
  let service: WikidataService;
  let httpMock: HttpTestingController;

  const mockSparqlResponse = {
    results: {
      bindings: [
        { tmdb: { value: '123' } },
        { tmdb: { value: '456' } },
        { tmdb: { value: '789' } }
      ]
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WikidataService
      ]
    });
    service = TestBed.inject(WikidataService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.removeItem('cannesWikidataCache');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('cannesWikidataCache');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return cached IDs when cache is valid', () => {
    const cached = { ids: [100, 200, 300], timestamp: Date.now() };
    localStorage.setItem('cannesWikidataCache', JSON.stringify(cached));

    let result: number[] | undefined;
    service.getCannesFilmIds().subscribe(ids => result = ids);

    // No HTTP request should be made
    httpMock.expectNone('https://query.wikidata.org/sparql');
    expect(result).toEqual([100, 200, 300]);
  });

  it('should fetch from API when cache is expired', () => {
    const expired = { ids: [100], timestamp: Date.now() - 86400001 };
    localStorage.setItem('cannesWikidataCache', JSON.stringify(expired));

    service.getCannesFilmIds().subscribe();

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    expect(req.request.params.get('format')).toBe('json');
    req.flush(mockSparqlResponse);
  });

  it('should fetch from API when no cache exists', () => {
    service.getCannesFilmIds().subscribe();

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    expect(req.request.params.has('query')).toBeTrue();
    expect(req.request.params.get('format')).toBe('json');
    expect(req.request.headers.get('Accept')).toBe('application/sparql-results+json');
    req.flush(mockSparqlResponse);
  });

  it('should extract TMDB IDs from SPARQL response', () => {
    let result: number[] | undefined;
    service.getCannesFilmIds().subscribe(ids => result = ids);

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    req.flush(mockSparqlResponse);

    expect(result).toEqual([123, 456, 789]);
  });

  it('should filter out invalid IDs (NaN, 0, negative)', () => {
    const responseWithBadIds = {
      results: {
        bindings: [
          { tmdb: { value: '123' } },
          { tmdb: { value: 'not-a-number' } },
          { tmdb: { value: '0' } },
          { tmdb: { value: '-5' } },
          { tmdb: { value: '456' } }
        ]
      }
    };

    let result: number[] | undefined;
    service.getCannesFilmIds().subscribe(ids => result = ids);

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    req.flush(responseWithBadIds);

    expect(result).toEqual([123, 456]);
  });

  it('should return empty array on network error', () => {
    let result: number[] | undefined;
    service.getCannesFilmIds().subscribe(ids => result = ids);

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    req.error(new ProgressEvent('Network error'));

    expect(result).toEqual([]);
  });

  it('should cache successful response in localStorage', () => {
    service.getCannesFilmIds().subscribe();

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    req.flush(mockSparqlResponse);

    const cached = JSON.parse(localStorage.getItem('cannesWikidataCache')!);
    expect(cached.ids).toEqual([123, 456, 789]);
    expect(cached.timestamp).toBeGreaterThan(0);
  });

  it('should not cache on error', () => {
    service.getCannesFilmIds().subscribe();

    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    req.error(new ProgressEvent('Network error'));

    expect(localStorage.getItem('cannesWikidataCache')).toBeNull();
  });

  it('should handle malformed cache gracefully', () => {
    localStorage.setItem('cannesWikidataCache', 'not-valid-json');

    let result: number[] | undefined;
    service.getCannesFilmIds().subscribe(ids => result = ids);

    // Should fall through to HTTP request since cache is invalid
    const req = httpMock.expectOne(r => r.url === 'https://query.wikidata.org/sparql');
    req.flush(mockSparqlResponse);

    expect(result).toEqual([123, 456, 789]);
  });
});
