import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent {
  @Output() search = new EventEmitter<string>();
  searchControl = new FormControl('');

  onSearch(): void {
    const query = this.searchControl.value?.trim();
    if (query) {
      this.search.emit(query);
      
      // Immediately scroll to the loading section
      setTimeout(() => {
        const loadingSection = document.getElementById('loading-section');
        if (loadingSection) {
          loadingSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      // After a delay, try to scroll to the results section if it exists
      setTimeout(() => {
        const moviesSection = document.getElementById('movies-section');
        if (moviesSection) {
          moviesSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 1000); // Longer delay to allow for API response and rendering
    }
  }
  
  clearSearch(event: Event): void {
    event.stopPropagation();
    this.searchControl.setValue('');
    this.searchControl.markAsPristine();
    this.searchControl.markAsUntouched();
  }
}
