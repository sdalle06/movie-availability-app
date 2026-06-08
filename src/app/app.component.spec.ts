import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { WatchlistService } from './services/watchlist.service';
import { WatchlistItem } from './models/tmdb.models';

function makeItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 1, mediaType: 'movie', title: 'Test', posterPath: null,
    addedAt: 0, available: false, offers: [], newOffers: [], lastChecked: 0,
    ...overrides
  };
}

describe('AppComponent', () => {
  let watchlistSpy: jasmine.SpyObj<WatchlistService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  async function setup(items: WatchlistItem[], nowAvailable: WatchlistItem[] = []): Promise<void> {
    const itemsSignal = signal<WatchlistItem[]>(items);
    watchlistSpy = jasmine.createSpyObj<WatchlistService>('WatchlistService',
      ['checkAvailability', 'count'], { items: itemsSignal.asReadonly() });
    watchlistSpy.count.and.returnValue(items.length);
    watchlistSpy.checkAvailability.and.returnValue(of(nowAvailable));

    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
      providers: [
        { provide: WatchlistService, useValue: watchlistSpy }
      ]
    })
      // The real HeaderComponent also injects WatchlistService; stub its template
      // so we exercise only AppComponent logic.
      .overrideComponent(HeaderComponent, { set: { template: '<div></div>' } })
      .compileComponents();
  }

  function createApp() {
    const fixture = TestBed.createComponent(AppComponent);
    // AppComponent imports MatSnackBarModule, which re-provides MatSnackBar at
    // the component level — so spy on its actual injected instance.
    snackBarSpy = (fixture.componentInstance as any).snackBar;
    spyOn(snackBarSpy, 'open');
    return fixture;
  }

  afterEach(() => localStorage.clear());

  it('should create the app', async () => {
    await setup([]);
    expect(createApp().componentInstance).toBeTruthy();
  });

  it('should have the correct title', async () => {
    await setup([]);
    expect(createApp().componentInstance.title).toEqual('Movie Availability App');
  });

  it('should render header component', async () => {
    await setup([]);
    const fixture = createApp();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-header')).toBeTruthy();
  });

  it('does not check availability when watchlist is empty', async () => {
    await setup([]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createApp().detectChanges();
    expect(watchlistSpy.checkAvailability).not.toHaveBeenCalled();
  });

  it('does not check availability when no platforms selected', async () => {
    await setup([makeItem()]);
    createApp().detectChanges();
    expect(watchlistSpy.checkAvailability).not.toHaveBeenCalled();
  });

  it('checks availability on init and notifies when items flip to available', async () => {
    await setup([makeItem()], [makeItem({ available: true })]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createApp().detectChanges();
    expect(watchlistSpy.checkAvailability).toHaveBeenCalledWith([8]);
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('does not show a snackbar when nothing flipped', async () => {
    await setup([makeItem()]);
    localStorage.setItem('selectedPlatforms', JSON.stringify([8]));
    createApp().detectChanges();
    expect(watchlistSpy.checkAvailability).toHaveBeenCalled();
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });
});
