import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { MovieCardComponent } from './movie-card.component';

describe('MovieCardComponent', () => {
  let component: MovieCardComponent;
  let fixture: ComponentFixture<MovieCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MovieCardComponent,
        RouterTestingModule,
        MatCardModule,
        MatIconModule,
        MatChipsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieCardComponent);
    component = fixture.componentInstance;
    
    // Provide a mock movie object
    component.movie = {
      id: 123,
      title: 'Test Movie',
      poster_path: '/test.jpg',
      overview: 'Test overview',
      vote_average: 8.5,
      release_date: '2023-01-01'
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
