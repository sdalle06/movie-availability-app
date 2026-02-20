export const REGIONS = ['FR', 'CA', 'US'];
export const MAX_ITEMS = 20;

export interface MoodDefinition {
  key: string;
  label: string;
  icon: string;
  movieGenres: number[];
  tvGenres: number[];
  minRating: number;
  extraParams?: Record<string, string>;
  /** When set, this mood uses a curated list of TMDB movie IDs instead of discover. */
  curatedMovieIds?: number[];
  /** When true, this mood is only shown in movie mode. */
  movieOnly?: boolean;
}

export const MOODS: MoodDefinition[] = [
  {
    key: 'light',
    label: 'Something Light',
    icon: 'sentiment_satisfied',
    movieGenres: [35, 16],            // Comedy, Animation
    tvGenres: [35, 16, 10751],        // Comedy, Animation, Family
    minRating: 6.5
  },
  {
    key: 'intense',
    label: 'Intense',
    icon: 'local_fire_department',
    movieGenres: [53, 28, 80],        // Thriller, Action, Crime
    tvGenres: [80, 10759, 10768],     // Crime, Action & Adventure, War & Politics
    minRating: 7
  },
  {
    key: 'mind-bending',
    label: 'Mind-Bending',
    icon: 'psychology',
    movieGenres: [878, 9648],         // Sci-Fi, Mystery
    tvGenres: [10765, 9648],          // Sci-Fi & Fantasy, Mystery
    minRating: 7
  },
  {
    key: 'feel-good',
    label: 'Feel-Good',
    icon: 'favorite',
    movieGenres: [10749, 35, 10402],  // Romance, Comedy, Music
    tvGenres: [35, 18, 10751],        // Comedy, Drama, Family
    minRating: 7
  },
  {
    key: 'french',
    label: 'French Cinema',
    icon: 'theater_comedy',
    movieGenres: [18, 35, 53, 80],    // Drama, Comedy, Thriller, Crime
    tvGenres: [18, 35, 80],           // Drama, Comedy, Crime
    minRating: 6.5,
    extraParams: { 'with_original_language': 'fr' },
    movieOnly: true
  },
  {
    key: 'auteur',
    label: 'Auteur Cinema',
    icon: 'movie_filter',
    movieGenres: [18],                // Drama
    tvGenres: [18],                   // Drama
    minRating: 7.5,
    extraParams: { 'vote_count.lte': '2000' },
    movieOnly: true
  },
  {
    key: 'festival',
    label: 'Cannes Festival',
    icon: 'emoji_events',
    movieGenres: [],
    tvGenres: [],
    minRating: 0,
    // Full Cannes Official Selection 2010-2024: In Competition + Un Certain Regard.
    // ~350 films with TMDB IDs verified via search API. TMDB keyword tagging for
    // Cannes is nearly empty (<5 tagged films), so this curated list is sourced
    // from the official festival records on Wikipedia.
    curatedMovieIds: [
      // 2024
      927547, 1064213, 1182047, 959604, 1128752, 1136837, 974950, 1232827,
      1098709, 1029955, 495278, 1145608, 592831, 842859, 1161879, 1113583,
      1109255, 1278263, 970947, 933260, 1278338, 1108336, 1144681, 1485372,
      850439, 1056648, 1281775, 1079310, 1379922, 1368090, 1001684, 1213982,
      1082938, 1233208, 1212337, 1257409, 1158996, 1012241, 846586, 1257407,
      // 2023
      665733, 915935, 628922, 747188, 995806, 925263, 837335, 938250,
      986280, 848439, 1069193, 1391738, 801112, 812037, 839369, 1203484,
      970348, 976893, 964960, 493514, 467244, 966488, 943134, 923150,
      714889, 1111750, 1028684, 1000130, 1075175, 986855, 1112527, 912520,
      937161, 889818, 1115379, 995746, 989589,
      // 2022
      615952, 788977, 736732, 836202, 901563, 819876, 705996, 803700,
      785398, 848958, 889699, 962558, 926889, 541724, 691214, 919570,
      790416, 603204, 901358, 914203, 497828, 958279, 682152, 888321,
      960206, 962571, 958291, 962562, 958487, 952701, 936378, 788734,
      812025, 962566, 962543,
      // 2021
      662029, 424277, 454527, 477044, 575764, 588182, 392269, 758866,
      735726, 662712, 602334, 542178, 672208, 820693, 511819, 797457,
      746131, 609490, 763329, 788942, 574078, 608980, 630240, 660120,
      585378, 644089, 833393, 836489, 835975, 660942, 788929, 695089,
      900877, 583198,
      // 2020 (non-competitive Official Selection due to COVID)
      580175, 664177, 581392, 659959, 660713, 981985, 712178, 585744,
      554371, 568467, 712121, 592695, 680813, 680952, 508442,
      // 2019
      496967, 446159, 535581, 505941, 403300, 539531, 504585, 519141,
      586863, 574097, 466272, 519010, 496243, 531428, 559401, 522369,
      575452, 504582, 575428, 522373, 517148, 595931, 575561, 548544,
      592807, 572404,
      // 2018
      517731, 487850, 441393, 485162, 519185, 487558, 813106, 517814,
      440298, 483184, 401545, 479520, 481432, 414030, 475930, 502897,
      505192, 485189, 396461, 418472, 517286, 517839, 562889, 515916,
      486898, 517987,
      // 2017
      399019, 451945, 777539, 429200, 399031, 423646, 444395, 399057,
      429174, 396398, 387426, 444428, 416186, 445768, 401246, 383709,
      398181, 451618, 452010, 446164, 452000, 395834, 444397,
      // 2016
      340485, 377273, 337674, 374458, 290098, 374473, 338189, 332872,
      339419, 392790, 301365, 370755, 340676, 375315, 374452, 374475,
      340481, 374671, 334533, 392807, 392795, 338766, 337703,
      // 2015
      253450, 258480, 337104, 314402, 254320, 225728, 329712, 314388,
      315846, 273481, 336050, 314405, 310593, 298721, 336222, 319373,
      334924,
      // 2014
      246860, 87492, 114982, 14372, 157851, 265177, 245700, 221667,
      265228, 221902, 265195, 265169, 265226, 265189, 265297, 267999,
      266030,
      // 2013
      119675, 152584, 179144, 186935, 152599, 86829, 177945, 129670,
      77987, 152603, 152780, 187022, 197082, 184314, 157354, 186997,
      187028, 186992,
      // 2012
      103740, 49014, 103328, 152578, 103753, 64689, 82633, 102001,
      86837, 83666, 103731, 83770, 103758, 97365, 126315, 84175, 110160,
      // 2011
      74643, 64690, 73532, 63831, 62215, 74879, 71157, 63311, 8967,
      71859, 78182, 50837, 75233,
      // 2010
      44009, 45958, 48303, 46332, 47909, 38368, 46705, 55151
    ]
  }
];

export interface GenreDefinition {
  id: number;
  name: string;
}

export const MOVIE_GENRES: GenreDefinition[] = [
  { id: 53, name: 'Thriller' },
  { id: 35, name: 'Comedy' },
  { id: 878, name: 'Sci-Fi' },
  { id: 18, name: 'Drama' },
  { id: 28, name: 'Action' },
  { id: 99, name: 'Documentary' },
  { id: 27, name: 'Horror' }
];

export const TV_GENRES: GenreDefinition[] = [
  { id: 80, name: 'Crime' },
  { id: 35, name: 'Comedy' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 18, name: 'Drama' },
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 99, name: 'Documentary' }
];
