import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-country-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './country-selector.component.html',
  styleUrls: ['./country-selector.component.scss']
})
export class CountrySelectorComponent implements OnInit {
  @Input() selectedCountry = 'US';
  @Output() countryChange = new EventEmitter<string>();
  
  countries: any[] = [];
  loading = false;
  error = '';

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.loading = true;
    this.movieService.getCountries().subscribe({
      next: (data) => {
        this.countries = data.sort((a: any, b: any) => 
          a.english_name.localeCompare(b.english_name)
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading countries:', err);
        this.error = 'Failed to load countries';
        this.loading = false;
      }
    });
  }

  onCountryChange(): void {
    this.countryChange.emit(this.selectedCountry);
  }
}
