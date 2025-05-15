import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

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
        ReactiveFormsModule
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
});
