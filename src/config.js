// API configuration
export const API_KEY = process.env.REACT_APP_TMDB_API_KEY || "YOUR_TMDB_API_KEY"; // Replace with your actual TMDB API key
export const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";
export const POSTER_SIZE = "w500";
export const BACKDROP_SIZE = "original";

// Console warning if API key is not set
if (API_KEY === "YOUR_TMDB_API_KEY") {
  console.warn(
    "Please set your TMDB API key in .env file as REACT_APP_TMDB_API_KEY or directly in the config.js file"
  );
}
