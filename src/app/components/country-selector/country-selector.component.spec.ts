import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { CountrySelectorComponent } from './country-selector.component';
import { MovieService } from '../../services/movie.service';

describe('CountrySelectorComponent', () => {
  let component: CountrySelectorComponent;
  let fixture: ComponentFixture<CountrySelectorComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;

  const mockCountries = [
    { iso_3166_1: 'US', english_name: 'United States' },
    { iso_3166_1: 'FR', english_name: 'France' },
    { iso_3166_1: 'GB', english_name: 'United Kingdom' }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('MovieService', ['getCountries']);
    spy.getCountries.and.returnValue(of(mockCountries));

    await TestBed.configureTestingModule({
      imports: [
        CountrySelectorComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatSelectModule,
        MatFormFieldModule,
        FormsModule
      ],
      providers: [
        { provide: MovieService, useValue: spy }
      ]
    })
    .compileComponents();

    movieServiceSpy = TestBed.inject(MovieService) as jasmine.SpyObj<MovieService>;

    fixture = TestBed.createComponent(CountrySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load countries on init', () => {
    expect(movieServiceSpy.getCountries).toHaveBeenCalled();
    expect(component.countries.length).toBe(3);
  });

  it('should sort countries alphabetically', () => {
    expect(component.countries[0].english_name).toBe('France');
    expect(component.countries[1].english_name).toBe('United Kingdom');
    expect(component.countries[2].english_name).toBe('United States');
  });

  it('should default to US as selected country', () => {
    expect(component.selectedCountry).toBe('US');
  });

  it('should emit countryChange on selection', () => {
    const emitSpy = spyOn(component.countryChange, 'emit');

    component.selectedCountry = 'FR';
    component.onCountryChange();

    expect(emitSpy).toHaveBeenCalledWith('FR');
  });

  it('should handle API error gracefully', () => {
    // Create a new component with error response
    movieServiceSpy.getCountries.and.returnValue(throwError(() => new Error('API Error')));

    const errorFixture = TestBed.createComponent(CountrySelectorComponent);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();

    expect(errorComponent.error).toBe('Failed to load countries');
    expect(errorComponent.loading).toBeFalse();
    expect(errorComponent.countries.length).toBe(0);
  });

  it('should set loading to false after countries load', () => {
    expect(component.loading).toBeFalse();
  });
});
