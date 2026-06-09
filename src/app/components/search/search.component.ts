import { Component, EventEmitter, Input, OnInit, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { SearchHistoryService } from '../../services/search-history.service';
import { SearchHistoryEntry } from '../../models/tmdb.models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  @Input() initialQuery = '';
  @Input() initialContentType = 'multi';
  @Output() search = new EventEmitter<{query: string, contentType: string, scroll?: boolean}>();
  searchControl = new FormControl('');
  contentTypeControl = new FormControl('multi');

  private searchHistory = inject(SearchHistoryService);
  /** Most recent searches, capped for the dropdown. */
  readonly suggestions = computed(() => this.searchHistory.entries().slice(0, 6));
  showSuggestions = false;

  ngOnInit(): void {
    if (this.initialQuery) {
      this.searchControl.setValue(this.initialQuery);
    }
    if (this.initialContentType) {
      this.contentTypeControl.setValue(this.initialContentType);
    }

    // Re-trigger search when content type changes if there's already a query.
    // Don't scroll — the user is refining results in place, not running a new search.
    this.contentTypeControl.valueChanges.subscribe(() => {
      if (this.searchControl.value?.trim()) {
        this.onSearch({ scroll: false });
      }
    });
  }

  onFocus(): void {
    this.showSuggestions = true;
  }

  onBlur(): void {
    // Delay so a click on a suggestion registers before the panel closes.
    setTimeout(() => (this.showSuggestions = false), 150);
  }

  selectSuggestion(entry: SearchHistoryEntry): void {
    this.showSuggestions = false;
    this.searchControl.setValue(entry.query);
    this.contentTypeControl.setValue(entry.contentType, { emitEvent: false });
    this.search.emit({ query: entry.query, contentType: entry.contentType });
  }

  /** Native form submit — fires on both the button and the mobile keyboard's Enter/Search key. */
  onSubmit(event: Event): void {
    event.preventDefault();
    this.onSearch();
  }

  onSearch(options: { scroll?: boolean } = { scroll: true }): void {
    const query = this.searchControl.value?.trim();
    const contentType = this.contentTypeControl.value || 'multi';
    const scroll = options.scroll !== false;
    if (query) {
      this.showSuggestions = false;
      this.search.emit({query, contentType, scroll});

      if (scroll) {
        // Simplified scrolling approach to avoid blocking issues
        setTimeout(() => {
          const loadingSection = document.getElementById('loading-section');
          if (loadingSection) {
            loadingSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
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
