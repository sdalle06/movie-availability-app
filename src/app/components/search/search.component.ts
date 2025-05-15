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
      
      // Use a single smooth scroll with a small delay to allow for the loading state to appear
      setTimeout(() => {
        // First try to scroll to the loading section
        const loadingSection = document.getElementById('loading-section');
        if (loadingSection) {
          // Use a smoother scroll with better easing
          this.smoothScroll(loadingSection);
        }
      }, 50);
    }
  }
  
  // Custom smooth scroll function with better easing
  private smoothScroll(element: HTMLElement): void {
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = elementPosition - startPosition;
    const duration = 600; // ms
    let startTime: number | null = null;
    
    // Easing function for smoother animation
    const easeInOutQuad = (t: number): number => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };
    
    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutQuad(progress);
      
      window.scrollTo(0, startPosition + distance * easedProgress);
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        // After scrolling is complete, check if we need to scroll to results
        // This ensures we only do one visual scroll movement
        this.checkAndScrollToResults();
      }
    };
    
    requestAnimationFrame(animation);
  }
  
  // Check for results and scroll if they exist
  private checkAndScrollToResults(): void {
    const moviesSection = document.getElementById('movies-section');
    if (moviesSection) {
      // If results are already available, scroll to them
      this.smoothScroll(moviesSection);
    } else {
      // If results aren't ready yet, set up a mutation observer to detect when they appear
      const observer = new MutationObserver((mutations, obs) => {
        const resultsSection = document.getElementById('movies-section');
        if (resultsSection) {
          // Results are now available, scroll to them
          this.smoothScroll(resultsSection);
          obs.disconnect(); // Stop observing
        }
      });
      
      // Start observing the parent container for changes
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        observer.observe(mainContent, { 
          childList: true, 
          subtree: true 
        });
        
        // Set a timeout to stop observing after a reasonable time
        setTimeout(() => observer.disconnect(), 10000);
      }
    }
  }
  
  clearSearch(event: Event): void {
    event.stopPropagation();
    this.searchControl.setValue('');
    this.searchControl.markAsPristine();
    this.searchControl.markAsUntouched();
  }
}
