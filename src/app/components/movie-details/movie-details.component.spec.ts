import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { of } from 'rxjs';

import { MovieDetailsComponent } from './movie-details.component';
import { MovieService } from '../../services/movie.service';
import { Component, Input } from '@angular/core';

// Mock components
@Component({
  selector: 'app-country-selector',
  template: '<div></div>',
  standalone: true
})
class MockCountrySelectorComponent {
  @Input() selectedCountry: string = 'US';
}

describe('MovieDetailsComponent', () => {
  let component: MovieDetailsComponent;
  let fixture: ComponentFixture<MovieDetailsComponent>;
  let movieServiceSpy: jasmine.SpyObj<MovieService>;

  beforeEach(async () => {
    // Create route stub with movie ID
    const activatedRouteStub = {
      paramMap: of(convertToParamMap({ id: '123' }))
    };

    // Create spy for MovieService
    movieServiceSpy = jasmine.createSpyObj('MovieService', [
      'getMovieDetails', 
      'getMovieWatchProviders',
      'getWatchProviders',
      'getWatchProvidersByRegion',
      'getCountries'
    ]);
    
    // Mock service responses
    movieServiceSpy.getMovieDetails.and.returnValue(of({
      id: 123,
      title: 'Test Movie',
      overview: 'Test overview',
      poster_path: '/test.jpg',
      release_date: '2023-01-01',
      vote_average: 8.5
    }));
    
    movieServiceSpy.getMovieWatchProviders.and.returnValue(of({
      results: {
        US: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix' }]
        }
      }
    }));

    movieServiceSpy.getCountries.and.returnValue(of([
      { iso_3166_1: 'US', english_name: 'United States' },
      { iso_3166_1: 'FR', english_name: 'France' }
    ]));
    
    await TestBed.configureTestingModule({
      imports: [
        MovieDetailsComponent,
        MockCountrySelectorComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatChipsModule,
        MatTabsModule,
        MatDividerModule,
        MatCardModule
      ],
      providers: [
        { provide: MovieService, useValue: movieServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
