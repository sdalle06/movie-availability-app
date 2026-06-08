import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { WatchlistComponent } from './watchlist.component';
import { WatchlistService } from '../../services/watchlist.service';
import { WatchlistItem } from '../../models/tmdb.models';

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

describe('WatchlistComponent', () => {
  let fixture: ComponentFixture<WatchlistComponent>;
  let component: WatchlistComponent;
  let watchlistSpy: jasmine.SpyObj<WatchlistService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let itemsSignal: ReturnType<typeof signal<WatchlistItem[]>>;

  async function setup(items: WatchlistItem[], nowAvailable: WatchlistItem[] = []): Promise<void> {
    itemsSignal = signal<WatchlistItem[]>(items);
    watchlistSpy = jasmine.createSpyObj<WatchlistService>('WatchlistService',
      ['checkAvailability', 'remove', 'clear'], { items: itemsSignal.asReadonly() });
    watchlistSpy.checkAvailability.and.returnValue(of(nowAvailable));

    await TestBed.configureTestingModule({
      imports: [WatchlistComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: WatchlistService, useValue: watchlistSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WatchlistComponent);
    component = fixture.componentInstance;

    // The standalone component imports MatSnackBarModule, which re-provides
    // MatSnackBar at the component level — so spy on its actual instance.
    snackBarSpy = (component as any).snackBar;
    spyOn(snackBarSpy, 'open');
  }

  afterEach(() => localStorage.clear());

  it('shows empty state when no items', async () => {
    await setup([]);
    fixture.detectChanges();
    const empty = fixture.debugElement.query(By.css('.empty-state'));
    expect(empty).toBeTruthy();
    expect(watchlistSpy.checkAvailability).not.toHaveBeenCalled();
  });

  it('renders a card per item', async () => {
    await setup([makeItem({ id: 1 }), makeItem({ id: 2, mediaType: 'tv' })]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('.watch-card'));
    expect(cards.length).toBe(2);
  });

  it('checks availability on init when platforms set and items exist', async () => {
    await setup([makeItem()]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    fixture.detectChanges();
    expect(watchlistSpy.checkAvailability).toHaveBeenCalledWith([8]);
  });

  it('does not check availability when no platforms selected', async () => {
    await setup([makeItem()]);
    fixture.detectChanges();
    expect(watchlistSpy.checkAvailability).not.toHaveBeenCalled();
  });

  it('shows a snackbar when an item gains new availability', async () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    await setup(
      [makeItem({ id: 1, title: 'Dune' })],
      [makeItem({ id: 1, title: 'Dune', offers: ['FR:8'], newOffers: ['FR:8'], available: true })]
    );
    fixture.detectChanges();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(snackBarSpy.open.calls.mostRecent().args[0]).toContain('Dune');
  });

  it('marks usable-available items with the now-available class', async () => {
    await setup([makeItem({ id: 1, available: true, offers: ['FR:8'] })]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('.watch-card'));
    expect(card.nativeElement.classList).toContain('now-available');
  });

  it('derives the badge from offers, ignoring a stale stored available flag', async () => {
    // Regression: stored available=false but offers show a usable region (FR).
    await setup([makeItem({ id: 1, offers: ['FR:8'], available: false })]);
    fixture.detectChanges();
    expect(component.isAvailable(makeItem({ offers: ['FR:8'], available: false }))).toBeTrue();
    const badge = fixture.debugElement.query(By.css('.availability-badge'));
    expect(badge.nativeElement.textContent).toContain('Available for you');
    expect(badge.nativeElement.classList).toContain('available');
  });

  it('shows usable-region flags (FR + non-EU) and excludes EU-locked regions', async () => {
    // FR + US + KR are usable; DE is portability-locked and must be excluded.
    await setup([makeItem({ id: 1, offers: ['FR:8', 'US:8', 'KR:8', 'DE:8'], available: true })]);
    fixture.detectChanges();
    const flags = fixture.debugElement.queryAll(By.css('.region-flag'));
    expect(flags.length).toBe(3); // FR, US, KR — not DE
  });

  it('orders usable regions France → preferred (US/CA) → others', async () => {
    await setup([]);
    const item = makeItem({ offers: ['KR:8', 'US:8', 'FR:8', 'CA:8', 'AU:8'] });
    expect(component.usableRegions(item)).toEqual(['FR', 'CA', 'US', 'AU', 'KR']);
  });

  it('separates usable from portability-locked counts', async () => {
    await setup([]);
    const item = makeItem({ offers: ['FR:8', 'KR:8', 'DE:8', 'ES:8'] });
    expect(component.usableRegions(item)).toEqual(['FR', 'KR']);
    expect(component.lockedRegionCount(item)).toBe(2);
  });

  it('caps displayed flags at 6 and shows a +N overflow', async () => {
    await setup([makeItem({ id: 1, offers: ['FR:8','US:8','CA:8','KR:8','AU:8','JP:8','BR:8','MX:8'], available: true })]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.region-flag')).length).toBe(6);
    expect(fixture.debugElement.query(By.css('.regions-extra')).nativeElement.textContent).toContain('+2');
  });

  it('shows the EU-locked message when an item only streams in EU-non-France', async () => {
    await setup([makeItem({ id: 1, offers: ['DE:8', 'ES:8'], available: false })]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.region-flag')).length).toBe(0);
    expect(fixture.debugElement.query(By.css('.regions.empty')).nativeElement.textContent)
      .toContain("can't reach from France");
  });

  it('flags new offers with the NEW chip and has-new class', async () => {
    await setup([makeItem({ id: 1, offers: ['FR:8'], newOffers: ['FR:8'], available: true })]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.new-chip'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.watch-card')).nativeElement.classList).toContain('has-new');
  });

  it('newRegions derives country codes from newOffers', async () => {
    await setup([]);
    expect(component.newRegions(makeItem({ newOffers: ['FR:8', 'CA:8'] }))).toEqual(['CA', 'FR']);
  });

  it('remove delegates to the service and stops navigation', async () => {
    await setup([makeItem({ id: 1 })]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    fixture.detectChanges();
    const event = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
    component.remove(makeItem({ id: 1 }), event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(watchlistSpy.remove).toHaveBeenCalledWith(1, 'movie');
  });

  it('builds the correct detail link per media type', async () => {
    await setup([]);
    expect(component.detailLink(makeItem({ id: 7, mediaType: 'movie' }))).toEqual(['/movies', '7']);
    expect(component.detailLink(makeItem({ id: 7, mediaType: 'tv' }))).toEqual(['/tv', '7']);
  });
});
