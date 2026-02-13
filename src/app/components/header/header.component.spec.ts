import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HeaderComponent,
        RouterTestingModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the app title', () => {
    expect(component.title).toBe('StreamRadar');
    const titleEl = fixture.debugElement.query(By.css('.title'));
    expect(titleEl.nativeElement.textContent).toContain('StreamRadar');
  });

  it('should have a home link with aria-label', () => {
    const logoLink = fixture.debugElement.query(By.css('.logo-container'));
    expect(logoLink).toBeTruthy();
    expect(logoLink.nativeElement.getAttribute('aria-label')).toBe('Home');
  });

  it('should have external link to TMDB', () => {
    const links = fixture.debugElement.queryAll(By.css('.nav-link'));
    const tmdbLink = links.find(link =>
      link.nativeElement.textContent.includes('TMDB')
    );
    expect(tmdbLink).toBeTruthy();
    expect(tmdbLink!.nativeElement.getAttribute('href')).toContain('themoviedb.org');
    expect(tmdbLink!.nativeElement.getAttribute('target')).toBe('_blank');
  });

  it('should have external link to JustWatch', () => {
    const links = fixture.debugElement.queryAll(By.css('.nav-link'));
    const justWatchLink = links.find(link =>
      link.nativeElement.textContent.includes('JustWatch')
    );
    expect(justWatchLink).toBeTruthy();
    expect(justWatchLink!.nativeElement.getAttribute('href')).toContain('justwatch.com');
    expect(justWatchLink!.nativeElement.getAttribute('target')).toBe('_blank');
  });
});
