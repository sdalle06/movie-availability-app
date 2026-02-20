import { Component, DestroyRef, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MovieService } from '../../services/movie.service';
import { WikidataService } from '../../services/wikidata.service';
import {
  SearchResultItem,
  Movie,
  TVShow,
  WatchProvider,
  CountryWatchProviders,
  PlatformAvailability
} from '../../models/tmdb.models';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import {
  REGIONS,
  MAX_ITEMS,
  MOODS,
  MoodDefinition,
  GenreDefinition,
  MOVIE_GENRES,
  TV_GENRES
} from '../../models/inspiration.constants';

export interface PickOfTheDayItem {
  item: SearchResultItem;
  details: Movie | TVShow | null;
  platforms: PlatformAvailability[];
}

@Component({
  selector: 'app-inspiration',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MovieCardComponent
  ],
  templateUrl: './inspiration.component.html',
  styleUrls: ['./inspiration.component.scss']
})
export class InspirationComponent implements OnInit {
  @ViewChild('moodCarousel') moodCarouselRef?: ElementRef<HTMLElement>;
  @ViewChild('genreCarousel') genreCarouselRef?: ElementRef<HTMLElement>;

  contentType: 'movie' | 'tv' = 'movie';
  selectedPlatforms: number[] = [];

  // Section data
  pickOfDay: PickOfTheDayItem | null = null;
  hiddenGems: SearchResultItem[] = [];
  moodResults: Record<string, SearchResultItem[]> = {};
  genreCache: Record<number, SearchResultItem[]> = {};
  trendingItems: SearchResultItem[] = [];

  // Keeps the last loaded genre items visible while a new genre loads
  displayedGenreItems: SearchResultItem[] = [];

  // Selection state
  selectedMood = 'light';
  selectedGenreId = 0;

  // Per-section loading
  loadingPickOfDay = false;
  loadingHiddenGems = false;
  loadingMoods = false;
  loadingGenre = false;
  loadingTrending = false;

  // Per-section errors
  errorHiddenGems = '';
  errorMoods = '';
  errorGenre = '';
  errorTrending = '';

  /** Moods visible in the template — hides movie-only moods in TV mode. */
  get moods(): MoodDefinition[] {
    if (this.contentType === 'tv') {
      return MOODS.filter(m => !m.curatedMovieIds && !m.movieOnly);
    }
    return MOODS;
  }

  private destroyRef = inject(DestroyRef);
  private imageBaseUrl = 'https://image.tmdb.org/t/p/';

  constructor(private movieService: MovieService, private wikidataService: WikidataService) {}

  get genres(): GenreDefinition[] {
    return this.contentType === 'movie' ? MOVIE_GENRES : TV_GENRES;
  }

  get hasPlatforms(): boolean {
    return this.selectedPlatforms.length > 0;
  }

  get selectedMoodItems(): SearchResultItem[] {
    return this.moodResults[this.selectedMood] || [];
  }


  get todayGenreId(): number {
    const dayOfYear = this.getDayOfYear();
    const genreList = this.genres;
    return genreList[dayOfYear % genreList.length].id;
  }

  ngOnInit(): void {
    this.loadPlatforms();
    this.selectedGenreId = this.todayGenreId;
    if (this.hasPlatforms) {
      this.loadAllSections();
    }
  }

  private loadPlatforms(): void {
    const stored = localStorage.getItem('selectedPlatforms');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.selectedPlatforms = parsed;
        }
      } catch {
        this.selectedPlatforms = [];
      }
    }
  }

  onContentTypeChange(type: 'movie' | 'tv'): void {
    this.contentType = type;
    this.pickOfDay = null;
    this.hiddenGems = [];
    this.moodResults = {};
    this.genreCache = {};
    this.trendingItems = [];
    this.displayedGenreItems = [];
    this.errorHiddenGems = '';
    this.errorMoods = '';
    this.errorGenre = '';
    this.errorTrending = '';
    this.selectedGenreId = this.todayGenreId;
    // Reset mood if current selection is not visible in the new content type
    if (!this.moods.some(m => m.key === this.selectedMood)) {
      this.selectedMood = this.moods[0]?.key || 'light';
    }
    if (this.hasPlatforms) {
      this.loadAllSections();
    }
  }

  onMoodSelect(moodKey: string): void {
    this.selectedMood = moodKey;
    this.resetCarouselScroll(this.moodCarouselRef);
  }

  onGenreSelect(genreId: number): void {
    this.selectedGenreId = genreId;
    if (this.genreCache[genreId]) {
      this.displayedGenreItems = this.genreCache[genreId];
      this.resetCarouselScroll(this.genreCarouselRef);
    } else {
      // Keep showing previous genre items while loading (no blink)
      this.loadGenre(genreId);
    }
  }

  private resetCarouselScroll(ref?: ElementRef<HTMLElement>): void {
    if (!ref) return;
    // Use setTimeout so the DOM updates with new items before we scroll
    setTimeout(() => ref.nativeElement.scrollTo({ left: 0 }));
  }

  private loadAllSections(): void {
    this.loadHiddenGemsAndPick();
    this.loadAllMoods();
    this.loadCuratedMoods();
    this.loadGenre(this.selectedGenreId);
    this.loadTrending();
  }

  private loadHiddenGemsAndPick(): void {
    this.loadingHiddenGems = true;
    this.loadingPickOfDay = true;
    this.errorHiddenGems = '';

    const dayOfYear = this.getDayOfYear();
    const gemsPage = String((dayOfYear % 5) + 1);
    // Show gems from the last 10 years so content rotates as new films qualify
    const tenYearsAgo = `${new Date().getFullYear() - 10}-01-01`;
    const dateLteKey = this.contentType === 'movie'
      ? 'primary_release_date.lte' : 'first_air_date.lte';
    const dateGteKey = this.contentType === 'movie'
      ? 'primary_release_date.gte' : 'first_air_date.gte';

    const calls: Record<string, ReturnType<MovieService['discover']>> = {};
    for (const region of REGIONS) {
      calls[`gems_${region}`] = this.movieService.discover(
        this.contentType, this.selectedPlatforms, region, 'vote_average.desc',
        {
          'vote_average.gte': '7.5',
          'vote_count.gte': '100',
          'vote_count.lte': '1000',
          [dateGteKey]: tenYearsAgo,
          [dateLteKey]: new Date().toISOString().split('T')[0],
          'page': gemsPage
        }
      );
    }

    forkJoin(calls).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        this.hiddenGems = this.mergeResults(
          REGIONS.map(r => results[`gems_${r}`].results || [])
        );
        this.loadingHiddenGems = false;

        // Pick of the Day from hidden gems
        if (this.hiddenGems.length > 0) {
          const dayOfYear = this.getDayOfYear();
          const pickItem = this.hiddenGems[dayOfYear % this.hiddenGems.length];
          this.enrichPickOfDay(pickItem);
        } else {
          this.loadingPickOfDay = false;
        }
      },
      error: () => {
        this.errorHiddenGems = 'Failed to load hidden gems.';
        this.loadingHiddenGems = false;
        this.loadingPickOfDay = false;
      }
    });
  }

  private enrichPickOfDay(item: SearchResultItem): void {
    const id = item.id;
    const isMovie = this.contentType === 'movie';

    const detailsCall = isMovie
      ? this.movieService.getMovieDetails(id)
      : this.movieService.getTVDetails(id);
    const providersCall = isMovie
      ? this.movieService.getMovieWatchProviders(id)
      : this.movieService.getTVWatchProviders(id);

    forkJoin({ details: detailsCall, providers: providersCall }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ details, providers }) => {
        const platforms = this.buildPlatformAvailability(providers.results);
        this.pickOfDay = { item, details, platforms };
        this.loadingPickOfDay = false;
      },
      error: () => {
        // Still show pick without enrichment
        this.pickOfDay = { item, details: null, platforms: [] };
        this.loadingPickOfDay = false;
      }
    });
  }

  /** Discover-based moods (excludes curated and movie-only moods when in TV mode). */
  private get discoverMoods(): MoodDefinition[] {
    if (this.contentType === 'tv') {
      return MOODS.filter(m => !m.curatedMovieIds && !m.movieOnly);
    }
    return MOODS.filter(m => !m.curatedMovieIds);
  }

  private loadAllMoods(): void {
    const moods = this.discoverMoods;
    if (moods.length === 0) {
      return;
    }

    this.loadingMoods = true;
    this.errorMoods = '';

    const dayOfYear = this.getDayOfYear();
    const moodsPage = String((dayOfYear % 3) + 1);
    const fiveYearsAgo = `${new Date().getFullYear() - 5}-01-01`;
    const dateLteKey = this.contentType === 'movie'
      ? 'primary_release_date.lte' : 'first_air_date.lte';
    const dateGteKey = this.contentType === 'movie'
      ? 'primary_release_date.gte' : 'first_air_date.gte';

    const calls: Record<string, ReturnType<MovieService['discover']>> = {};
    for (const mood of moods) {
      const genres = this.contentType === 'movie' ? mood.movieGenres : mood.tvGenres;
      const genreParam = genres.length > 0 ? genres.join('|') : '';
      for (const region of REGIONS) {
        const params: Record<string, string> = {
          'vote_average.gte': String(mood.minRating),
          'vote_count.gte': '50',
          [dateGteKey]: fiveYearsAgo,
          [dateLteKey]: new Date().toISOString().split('T')[0],
          'page': moodsPage,
          ...(mood.extraParams || {})
        };
        if (genreParam) {
          params['with_genres'] = genreParam;
        }
        calls[`${mood.key}_${region}`] = this.movieService.discover(
          this.contentType, this.selectedPlatforms, region, 'popularity.desc',
          params
        );
      }
    }

    forkJoin(calls).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        for (const mood of moods) {
          this.moodResults[mood.key] = this.mergeResults(
            REGIONS.map(r => results[`${mood.key}_${r}`].results || [])
          );
        }
        this.loadingMoods = false;
      },
      error: () => {
        this.errorMoods = 'Failed to load mood recommendations.';
        this.loadingMoods = false;
      }
    });
  }

  /**
   * Loads curated moods (e.g. Cannes Festival) by fetching individual movie details.
   * These bypass the discover endpoint since they use a handpicked list of TMDB IDs.
   * Curated moods are movie-only; in TV mode they get an empty result set.
   */
  private loadCuratedMoods(): void {
    const curatedMoods = MOODS.filter(m => m.curatedMovieIds && m.curatedMovieIds.length > 0);
    if (curatedMoods.length === 0) return;

    for (const mood of curatedMoods) {
      if (this.contentType !== 'movie') {
        // Curated lists are film-only (e.g. Cannes is a film festival)
        this.moodResults[mood.key] = [];
        continue;
      }

      this.wikidataService.getCannesFilmIds().pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(wikidataIds => {
        // Merge Wikidata (dynamic) + curated (static), dedup via Set
        // Wikidata IDs first so newer films get priority in the daily rotation
        const mergedIds = [...new Set([...wikidataIds, ...mood.curatedMovieIds!])];

        // Rotate subset based on day so the carousel changes daily
        const dayOfYear = this.getDayOfYear();
        const subsetSize = Math.min(MAX_ITEMS, mergedIds.length);
        const startIndex = dayOfYear % mergedIds.length;
        const subset: number[] = [];
        for (let i = 0; i < subsetSize; i++) {
          subset.push(mergedIds[(startIndex + i) % mergedIds.length]);
        }

        const calls = subset.map(id => this.movieService.getMovieDetails(id));

        forkJoin(calls).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: (movies) => {
            this.moodResults[mood.key] = movies
              .filter(m => m && m.id)
              .map(m => ({ ...m, media_type: 'movie' as const } as SearchResultItem));
          },
          error: () => {
            this.moodResults[mood.key] = [];
          }
        });
      });
    }
  }

  loadGenre(genreId: number): void {
    if (this.genreCache[genreId]) return;

    this.loadingGenre = true;
    this.errorGenre = '';

    const dayOfYear = this.getDayOfYear();
    const genrePage = String((dayOfYear % 3) + 1);

    const calls: Record<string, ReturnType<MovieService['discover']>> = {};
    for (const region of REGIONS) {
      calls[`genre_${region}`] = this.movieService.discover(
        this.contentType, this.selectedPlatforms, region, 'popularity.desc',
        {
          'with_genres': String(genreId),
          'vote_average.gte': '7',
          'vote_count.gte': '50',
          'page': genrePage
        }
      );
    }

    forkJoin(calls).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        const items = this.mergeResults(
          REGIONS.map(r => results[`genre_${r}`].results || [])
        );
        this.genreCache[genreId] = items;
        // Only update display if this genre is still the selected one
        if (this.selectedGenreId === genreId) {
          this.displayedGenreItems = items;
          this.resetCarouselScroll(this.genreCarouselRef);
        }
        this.loadingGenre = false;
      },
      error: () => {
        this.errorGenre = 'Failed to load genre content.';
        this.loadingGenre = false;
      }
    });
  }

  private loadTrending(): void {
    this.loadingTrending = true;
    this.errorTrending = '';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const dateLteKey = this.contentType === 'movie'
      ? 'primary_release_date.lte' : 'first_air_date.lte';
    const dateGteKey = this.contentType === 'movie'
      ? 'primary_release_date.gte' : 'first_air_date.gte';

    const calls: Record<string, ReturnType<MovieService['discover']>> = {};
    for (const region of REGIONS) {
      calls[`trending_${region}`] = this.movieService.discover(
        this.contentType, this.selectedPlatforms, region, 'popularity.desc',
        { [dateGteKey]: thirtyDaysAgo, [dateLteKey]: today }
      );
    }

    forkJoin(calls).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        this.trendingItems = this.mergeResults(
          REGIONS.map(r => results[`trending_${r}`].results || [])
        );
        this.loadingTrending = false;
      },
      error: () => {
        this.errorTrending = 'Failed to load trending content.';
        this.loadingTrending = false;
      }
    });
  }

  /**
   * Round-robin merge: picks one item from each region in turn so that
   * content from CA/US isn't drowned out by FR results.
   */
  private mergeResults(regionArrays: SearchResultItem[][]): SearchResultItem[] {
    const seen = new Set<number>();
    const merged: SearchResultItem[] = [];
    const indices = regionArrays.map(() => 0);
    const maxLen = Math.max(...regionArrays.map(a => a.length));

    for (let round = 0; round < maxLen && merged.length < MAX_ITEMS; round++) {
      for (let r = 0; r < regionArrays.length && merged.length < MAX_ITEMS; r++) {
        while (indices[r] < regionArrays[r].length) {
          const item = regionArrays[r][indices[r]];
          indices[r]++;
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push({ ...item, media_type: this.contentType } as SearchResultItem);
            break; // move to next region
          }
          // skip duplicate, try next item from same region in this round
        }
      }
    }

    return merged;
  }

  private buildPlatformAvailability(
    watchResults: Record<string, CountryWatchProviders>
  ): PlatformAvailability[] {
    const platformMap = new Map<number, PlatformAvailability>();

    const countryNames: Record<string, string> = {
      'FR': 'France', 'CA': 'Canada', 'US': 'United States',
      'GB': 'United Kingdom', 'DE': 'Germany', 'IT': 'Italy',
      'ES': 'Spain', 'NL': 'Netherlands', 'BE': 'Belgium',
      'AU': 'Australia', 'JP': 'Japan', 'BR': 'Brazil'
    };

    Object.entries(watchResults).forEach(([countryCode, data]) => {
      const providers: WatchProvider[] = [
        ...(data.flatrate || [])
      ];

      providers
        .filter(p => this.selectedPlatforms.includes(p.provider_id))
        .forEach(provider => {
          if (!platformMap.has(provider.provider_id)) {
            platformMap.set(provider.provider_id, {
              platformId: provider.provider_id,
              platformName: provider.provider_name,
              logoPath: provider.logo_path,
              countries: []
            });
          }
          const platform = platformMap.get(provider.provider_id)!;
          if (!platform.countries.some(c => c.countryCode === countryCode)) {
            platform.countries.push({
              countryCode,
              countryName: countryNames[countryCode] || countryCode
            });
          }
        });
    });

    const result = Array.from(platformMap.values());
    result.sort((a, b) => a.platformName.localeCompare(b.platformName));
    result.forEach(p => p.countries.sort((a, b) => a.countryName.localeCompare(b.countryName)));
    return result;
  }

  // Template helpers

  getTitle(item: SearchResultItem): string {
    return ('title' in item ? (item as Movie).title : undefined)
      || ('name' in item ? (item as TVShow).name : undefined)
      || 'Unknown Title';
  }

  getPickTitle(): string {
    if (!this.pickOfDay) return '';
    if (this.pickOfDay.details) {
      return ('title' in this.pickOfDay.details
        ? (this.pickOfDay.details as Movie).title : undefined)
        || ('name' in this.pickOfDay.details
          ? (this.pickOfDay.details as TVShow).name : undefined)
        || this.getTitle(this.pickOfDay.item);
    }
    return this.getTitle(this.pickOfDay.item);
  }

  getPickYear(): string {
    if (!this.pickOfDay) return '';
    const details = this.pickOfDay.details || this.pickOfDay.item;
    const date = ('release_date' in details ? (details as Movie).release_date : undefined)
      || ('first_air_date' in details ? (details as TVShow).first_air_date : undefined)
      || '';
    return date ? new Date(date).getFullYear().toString() : '';
  }

  getPickRuntime(): string {
    if (!this.pickOfDay?.details) return '';
    if ('runtime' in this.pickOfDay.details && (this.pickOfDay.details as Movie).runtime) {
      const mins = (this.pickOfDay.details as Movie).runtime!;
      return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }
    if ('episode_run_time' in this.pickOfDay.details) {
      const runtimes = (this.pickOfDay.details as TVShow).episode_run_time;
      if (runtimes && runtimes.length > 0) {
        return `${runtimes[0]}m/ep`;
      }
    }
    if ('number_of_seasons' in this.pickOfDay.details) {
      const seasons = (this.pickOfDay.details as TVShow).number_of_seasons;
      if (seasons) {
        return `${seasons} season${seasons > 1 ? 's' : ''}`;
      }
    }
    return '';
  }

  getPickGenres(): string {
    if (!this.pickOfDay?.details?.genres) return '';
    return this.pickOfDay.details.genres.map(g => g.name).join(', ');
  }

  getPickOverview(): string {
    if (!this.pickOfDay) return '';
    return this.pickOfDay.details?.overview || this.pickOfDay.item.overview || '';
  }

  getPickRating(): number {
    if (!this.pickOfDay) return 0;
    return this.pickOfDay.details?.vote_average || this.pickOfDay.item.vote_average || 0;
  }

  getPickBackdrop(): string {
    if (!this.pickOfDay) return '';
    const path = this.pickOfDay.details?.backdrop_path || this.pickOfDay.item.backdrop_path;
    return path ? `${this.imageBaseUrl}original${path}` : '';
  }

  getPickPoster(): string {
    if (!this.pickOfDay) return '';
    const path = this.pickOfDay.details?.poster_path || this.pickOfDay.item.poster_path;
    return path ? `${this.imageBaseUrl}w500${path}` : '';
  }

  getPickDetailLink(): string {
    if (!this.pickOfDay) return '';
    const prefix = this.contentType === 'movie' ? '/movies' : '/tv';
    return `${prefix}/${this.pickOfDay.item.id}`;
  }

  getProviderLogoUrl(logoPath: string): string {
    return `${this.imageBaseUrl}w92${logoPath}`;
  }

  getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  getGenreName(genreId: number): string {
    const genre = this.genres.find(g => g.id === genreId);
    return genre ? genre.name : '';
  }

  getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  scrollCarousel(el: HTMLElement | undefined, direction: 'left' | 'right'): void {
    if (!el) return;
    const scrollAmount = 600;
    el.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  getHiddenGemsBrowseParams(): Record<string, string> {
    return {
      sort: 'vote_average.desc',
      type: this.contentType,
      vote_count_min: '100',
      vote_count_max: '1000',
      min_rating: '7.5'
    };
  }

  getTrendingBrowseParams(): Record<string, string> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    return {
      sort: 'popularity.desc',
      type: this.contentType,
      date_from: thirtyDaysAgo
    };
  }
}
