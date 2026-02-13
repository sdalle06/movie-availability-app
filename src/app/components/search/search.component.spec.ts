import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { SearchComponent } from './search.component';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SearchComponent,
        ReactiveFormsModule,
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIconModule,
        MatButtonToggleModule,
        NoopAnimationsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form control for search input', () => {
    expect(component.searchControl).toBeDefined();
    expect(component.searchControl.value).toBe('');
  });

  it('should have a content type control defaulting to multi', () => {
    expect(component.contentTypeControl).toBeDefined();
    expect(component.contentTypeControl.value).toBe('multi');
  });

  it('should emit search event with query and contentType when onSearch is called', () => {
    const searchQuery = 'test movie';
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue(searchQuery);

    component.onSearch();

    expect(searchSpy).toHaveBeenCalledWith({query: searchQuery, contentType: 'multi'});
  });

  it('should emit with movie contentType when toggled', () => {
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue('test');
    component.contentTypeControl.setValue('movie');

    component.onSearch();

    expect(searchSpy).toHaveBeenCalledWith({query: 'test', contentType: 'movie'});
  });

  it('should not emit search event when onSearch is called with empty input', () => {
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue('');

    component.onSearch();

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should not emit search event when onSearch is called with only whitespace', () => {
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue('   ');

    component.onSearch();

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should clear search input when clearSearch is called', () => {
    const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
    component.searchControl.setValue('test movie');

    component.clearSearch(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.searchControl.value).toBe('');
    expect(component.searchControl.pristine).toBeTrue();
    expect(component.searchControl.untouched).toBeTrue();
  });

  it('should trigger onSearch when search button is clicked', () => {
    const searchQuery = 'test movie';
    const searchSpy = spyOn(component, 'onSearch');
    component.searchControl.setValue(searchQuery);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.search-button'));
    button.nativeElement.click();

    expect(searchSpy).toHaveBeenCalled();
  });

  it('should trigger onSearch when Enter key is pressed in input', () => {
    const searchQuery = 'test movie';
    const searchSpy = spyOn(component, 'onSearch');
    component.searchControl.setValue(searchQuery);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.triggerEventHandler('keyup.enter', {});

    expect(searchSpy).toHaveBeenCalled();
  });

  it('should disable search button when input is empty', () => {
    component.searchControl.setValue('');
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.search-button'));
    expect(button.nativeElement.disabled).toBeTrue();
  });

  it('should enable search button when input has value', () => {
    component.searchControl.setValue('test');
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.search-button'));
    expect(button.nativeElement.disabled).toBeFalse();
  });

  it('should have aria-label on content type toggle group', () => {
    const toggleGroup = fixture.debugElement.query(By.css('mat-button-toggle-group'));
    expect(toggleGroup.nativeElement.getAttribute('aria-label')).toBe('Content type filter');
  });
});
