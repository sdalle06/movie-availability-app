import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { PlatformSelectorComponent } from './platform-selector.component';
import { MovieService } from '../../services/movie.service';

describe('PlatformSelectorComponent', () => {
  let component: PlatformSelectorComponent;
  let fixture: ComponentFixture<PlatformSelectorComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;

  const mockProviders = {
    results: [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/path/to/netflix.jpg' },
      { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' },
      { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' },
      { provider_id: 337, provider_name: 'Disney+', logo_path: '/path/to/disney.jpg' },
      { provider_id: 350, provider_name: 'Apple TV+', logo_path: '/path/to/apple.jpg' },
      { provider_id: 100, provider_name: 'Amazon Channel Something', logo_path: '/path/to/amazon-channel.jpg' }
    ]
  };

  const mockFranceProviders = {
    results: [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/path/to/netflix.jpg' },
      { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' },
      { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' },
      { provider_id: 337, provider_name: 'Disney+', logo_path: '/path/to/disney.jpg' }
    ]
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('MovieService', ['getWatchProvidersByRegion']);

    await TestBed.configureTestingModule({
      imports: [
        PlatformSelectorComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatCardModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        { provide: MovieService, useValue: spy }
      ]
    })
    .compileComponents();

    movieServiceSpy = TestBed.inject(MovieService) as jasmine.SpyObj<MovieService>;
    // Default region (US) returns mockProviders, FR returns mockFranceProviders
    movieServiceSpy.getWatchProvidersByRegion.and.callFake((region?: string) => {
      if (region === 'FR') {
        return of(mockFranceProviders as any);
      }
      return of(mockProviders as any);
    });
  });

  beforeEach(() => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    fixture = TestBed.createComponent(PlatformSelectorComponent);
    component = fixture.componentInstance;

    // Override the default behavior of selecting all popular providers
    component.selectedPlatforms = [];

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load providers on init using forkJoin', () => {
    expect(movieServiceSpy.getWatchProvidersByRegion).toHaveBeenCalledWith();
    expect(movieServiceSpy.getWatchProvidersByRegion).toHaveBeenCalledWith('FR');
  });

  it('should include Prime Video in providers list', () => {
    component.allProviders = [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/path/to/netflix.jpg' },
      { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' },
      { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/path/to/prime.jpg' },
      { provider_id: 100, provider_name: 'Amazon Channel Something', logo_path: '/path/to/amazon-channel.jpg' }
    ];

    component.providers = component.allProviders.filter(p =>
      p.provider_id === 9 || p.provider_id === 119 || p.provider_id === 8
    );

    expect(component.providers.some(p => p.provider_id === 9 || p.provider_id === 119)).toBeTrue();
  });

  it('should load selected platforms from localStorage if available', () => {
    fixture = TestBed.createComponent(PlatformSelectorComponent);
    component = fixture.componentInstance;

    const savedPlatforms = [8, 9];
    (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(savedPlatforms));

    component.ngOnInit();

    expect(localStorage.getItem).toHaveBeenCalledWith('selectedPlatforms');
    expect(component.selectedPlatforms).toEqual(savedPlatforms);
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    fixture = TestBed.createComponent(PlatformSelectorComponent);
    component = fixture.componentInstance;

    (localStorage.getItem as jasmine.Spy).and.returnValue('invalid-json');

    component.ngOnInit();

    expect(localStorage.removeItem).toHaveBeenCalledWith('selectedPlatforms');
  });

  it('should toggle a platform on and off', () => {
    const platformsChangeSpy = spyOn(component.platformsChange, 'emit');

    component.selectedPlatforms = [8];

    component.togglePlatform(337);

    expect(component.selectedPlatforms).toContain(337);
    expect(platformsChangeSpy).toHaveBeenCalledWith([8, 337]);

    component.togglePlatform(8);

    expect(component.selectedPlatforms).not.toContain(8);
    expect(component.selectedPlatforms).toEqual([337]);
    expect(platformsChangeSpy).toHaveBeenCalledWith([337]);
  });

  it('should check if a platform is selected', () => {
    component.selectedPlatforms = [8, 337];

    expect(component.isPlatformSelected(8)).toBeTrue();
    expect(component.isPlatformSelected(337)).toBeTrue();
    expect(component.isPlatformSelected(350)).toBeFalse();
  });

  it('should clear all selected platforms', () => {
    component.selectedPlatforms = [8, 337, 350];
    const platformsChangeSpy = spyOn(component.platformsChange, 'emit');

    component.clearAll();

    expect(component.selectedPlatforms.length).toBe(0);
    expect(platformsChangeSpy).toHaveBeenCalledWith([]);
  });

  it('should toggle between popular and all providers', () => {
    component.allProviders = mockFranceProviders.results as any;
    component.popularProviders = [mockFranceProviders.results[0]] as any;
    component.providers = component.popularProviders;

    component.toggleShowAllProviders();

    expect(component.showAllProviders).toBeTrue();
    expect(component.providers).toEqual(component.allProviders);

    component.toggleShowAllProviders();

    expect(component.showAllProviders).toBeFalse();
    expect(component.providers).toEqual(component.popularProviders);
  });

  it('should handle errors when loading providers', () => {
    movieServiceSpy.getWatchProvidersByRegion.and.returnValue(throwError(() => new Error('API Error')));

    const errorFixture = TestBed.createComponent(PlatformSelectorComponent);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();

    expect(errorComponent.error).toBe('Failed to load streaming platforms');
    expect(errorComponent.loading).toBeFalse();
  });

  it('should show loading spinner when loading', () => {
    component.loading = true;
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeTruthy();
  });

  it('should show error message when there is an error', () => {
    component.error = 'Test error message';
    component.loading = false;
    fixture.detectChanges();

    const errorMessage = fixture.debugElement.query(By.css('.error-message'));
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.nativeElement.textContent).toContain('Test error message');
  });
});
