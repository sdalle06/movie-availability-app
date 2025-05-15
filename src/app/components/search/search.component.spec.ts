import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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

  it('should emit search event when onSearch is called with valid input', () => {
    // Arrange
    const searchQuery = 'test movie';
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue(searchQuery);
    
    // Act
    component.onSearch();
    
    // Assert
    expect(searchSpy).toHaveBeenCalledWith(searchQuery);
  });

  it('should not emit search event when onSearch is called with empty input', () => {
    // Arrange
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue('');  // Empty string
    
    // Act
    component.onSearch();
    
    // Assert
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should not emit search event when onSearch is called with only whitespace', () => {
    // Arrange
    const searchSpy = spyOn(component.search, 'emit');
    component.searchControl.setValue('   ');  // Just whitespace
    
    // Act
    component.onSearch();
    
    // Assert
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should clear search input when clearSearch is called', () => {
    // Arrange
    const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
    component.searchControl.setValue('test movie');
    
    // Act
    component.clearSearch(mockEvent);
    
    // Assert
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.searchControl.value).toBe('');
    expect(component.searchControl.pristine).toBeTrue();
    expect(component.searchControl.untouched).toBeTrue();
  });

  it('should trigger onSearch when search button is clicked', () => {
    // Arrange
    const searchQuery = 'test movie';
    const searchSpy = spyOn(component, 'onSearch');
    component.searchControl.setValue(searchQuery);
    fixture.detectChanges();
    
    // Act
    const button = fixture.debugElement.query(By.css('.search-button'));
    button.nativeElement.click();
    
    // Assert
    expect(searchSpy).toHaveBeenCalled();
  });

  it('should trigger onSearch when Enter key is pressed in input', () => {
    // Arrange
    const searchQuery = 'test movie';
    const searchSpy = spyOn(component, 'onSearch');
    component.searchControl.setValue(searchQuery);
    fixture.detectChanges();
    
    // Act
    const input = fixture.debugElement.query(By.css('input'));
    input.triggerEventHandler('keyup.enter', {});
    
    // Assert
    expect(searchSpy).toHaveBeenCalled();
  });

  it('should disable search button when input is empty', () => {
    // Arrange
    component.searchControl.setValue('');
    fixture.detectChanges();
    
    // Act & Assert
    const button = fixture.debugElement.query(By.css('.search-button'));
    expect(button.nativeElement.disabled).toBeTrue();
  });

  it('should enable search button when input has value', () => {
    // Arrange
    component.searchControl.setValue('test');
    fixture.detectChanges();
    
    // Act & Assert
    const button = fixture.debugElement.query(By.css('.search-button'));
    expect(button.nativeElement.disabled).toBeFalse();
  });
});
