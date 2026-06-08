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
    lastChecked: 0,
    notifiedAvailable: false,
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

  it('shows a snackbar when items become available', async () => {
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    await setup([makeItem({ id: 1, title: 'Dune' })], [makeItem({ id: 1, title: 'Dune', available: true })]);
    fixture.detectChanges();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(snackBarSpy.open.calls.mostRecent().args[0]).toContain('Dune');
  });

  it('marks available items with the now-available class', async () => {
    await setup([makeItem({ id: 1, available: true })]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('.watch-card'));
    expect(card.nativeElement.classList).toContain('now-available');
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
