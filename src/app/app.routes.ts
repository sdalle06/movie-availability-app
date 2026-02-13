import { Routes } from '@angular/router';
import { MovieListComponent } from './components/movie-list/movie-list.component';
import { MovieDetailsComponent } from './components/movie-details/movie-details.component';
import { InspirationComponent } from './components/inspiration/inspiration.component';
import { BrowseComponent } from './components/browse/browse.component';

export const routes: Routes = [
  { path: '', redirectTo: '/movies', pathMatch: 'full' },
  { path: 'movies', component: MovieListComponent },
  { path: 'movies/:id', component: MovieDetailsComponent },
  { path: 'tv/:id', component: MovieDetailsComponent },
  { path: 'inspiration', component: InspirationComponent },
  { path: 'browse', component: BrowseComponent },
  { path: '**', redirectTo: '/movies' }
];
