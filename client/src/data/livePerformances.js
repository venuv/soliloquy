// Live Shakespeare Performances Data
// Curated list of major Shakespeare productions worldwide for 2025-2026 season

export const VENUES = {
  // UK Venues
  globe: {
    id: 'globe',
    name: "Shakespeare's Globe",
    shortName: 'Globe',
    city: 'London',
    country: 'UK',
    region: 'europe',
    website: 'https://www.shakespearesglobe.com',
    description: 'The reconstructed Globe Theatre on the South Bank of the Thames.',
    coordinates: { lat: 51.5081, lng: -0.0972 }
  },
  rsc: {
    id: 'rsc',
    name: 'Royal Shakespeare Company',
    shortName: 'RSC',
    city: 'Stratford-upon-Avon',
    country: 'UK',
    region: 'europe',
    website: 'https://www.rsc.org.uk',
    description: "Britain's flagship Shakespeare theatre company.",
    coordinates: { lat: 52.1917, lng: -1.7083 }
  },

  // North America Venues
  stratfordFestival: {
    id: 'stratfordFestival',
    name: 'Stratford Festival',
    shortName: 'Stratford',
    city: 'Stratford, Ontario',
    country: 'Canada',
    region: 'north-america',
    website: 'https://www.stratfordfestival.ca',
    description: "North America's largest classical repertory theatre.",
    coordinates: { lat: 43.3681, lng: -80.9822 }
  },
  osf: {
    id: 'osf',
    name: 'Oregon Shakespeare Festival',
    shortName: 'OSF',
    city: 'Ashland, Oregon',
    country: 'USA',
    region: 'north-america',
    website: 'https://www.osfashland.org',
    description: "Founded in 1935, one of America's oldest and largest professional non-profit theatres.",
    coordinates: { lat: 42.1946, lng: -122.7095 }
  },
  publicTheater: {
    id: 'publicTheater',
    name: 'Free Shakespeare in the Park',
    shortName: 'NYC Park',
    city: 'New York City',
    country: 'USA',
    region: 'north-america',
    website: 'https://publictheater.org',
    description: 'Free Shakespeare at the Delacorte Theater in Central Park.',
    coordinates: { lat: 40.7803, lng: -73.9690 }
  },
  chicagoShakes: {
    id: 'chicagoShakes',
    name: 'Chicago Shakespeare Theater',
    shortName: 'Chicago Shakes',
    city: 'Chicago',
    country: 'USA',
    region: 'north-america',
    website: 'https://www.chicagoshakes.com',
    description: 'Award-winning theater on Navy Pier.',
    coordinates: { lat: 41.8919, lng: -87.6051 }
  },
  utahShakes: {
    id: 'utahShakes',
    name: 'Utah Shakespeare Festival',
    shortName: 'Utah Shakes',
    city: 'Cedar City, Utah',
    country: 'USA',
    region: 'north-america',
    website: 'https://www.bard.org',
    description: 'Tony Award-winning festival in the mountains of Southern Utah.',
    coordinates: { lat: 37.6775, lng: -113.0619 }
  },
  coloradoShakes: {
    id: 'coloradoShakes',
    name: 'Colorado Shakespeare Festival',
    shortName: 'Colorado Shakes',
    city: 'Boulder, Colorado',
    country: 'USA',
    region: 'north-america',
    website: 'https://cupresents.org/series/shakespeare-festival/',
    description: 'Professional theater under the stars in Boulder.',
    coordinates: { lat: 40.0076, lng: -105.2659 }
  },

  // Australia
  bellShakespeare: {
    id: 'bellShakespeare',
    name: 'Bell Shakespeare',
    shortName: 'Bell',
    city: 'Sydney',
    country: 'Australia',
    region: 'oceania',
    website: 'https://www.bellshakespeare.com.au',
    description: "Australia's national Shakespeare company.",
    coordinates: { lat: -33.8568, lng: 151.2153 }
  }
};

export const PERFORMANCES = [
  // ===========================
  // SHAKESPEARE'S GLOBE 2025-2026
  // ===========================
  {
    id: 'globe-romeo-juliet-2025',
    play: 'Romeo and Juliet',
    venue: 'globe',
    startDate: '2025-04-25',
    endDate: '2025-08-02',
    director: 'Sean Holmes',
    cast: ['Rawaed Asde', 'Lola Shalam'],
    description: "The Globe's Associate Artistic Director Sean Holmes directs this summer production.",
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/romeo-and-juliet/',
    highlight: true
  },
  {
    id: 'globe-merry-wives-2025',
    play: 'The Merry Wives of Windsor',
    venue: 'globe',
    startDate: '2025-07-04',
    endDate: '2025-09-20',
    director: 'Sean Holmes',
    description: "A comedy of wit and mischief in the Globe's open-air theater.",
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/'
  },
  {
    id: 'globe-twelfth-night-2025',
    play: 'Twelfth Night',
    venue: 'globe',
    startDate: '2025-08-08',
    endDate: '2025-10-25',
    director: 'Robin Belfield',
    description: "Shakespeare's beloved comedy of disguise and desire.",
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/'
  },
  {
    id: 'globe-troilus-2025',
    play: 'Troilus and Cressida',
    venue: 'globe',
    startDate: '2025-09-26',
    endDate: '2025-10-26',
    director: 'Owen Horsley',
    description: "Owen Horsley makes his Globe directorial debut with Shakespeare's dark comedy.",
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/'
  },
  {
    id: 'globe-romeo-juliet-welsh-2025',
    play: 'Romeo a Juliet',
    venue: 'globe',
    startDate: '2025-11-05',
    endDate: '2025-11-08',
    director: 'Steffan Donnelly',
    description: 'Groundbreaking bilingual production combining Welsh and English in the Sam Wanamaker Playhouse.',
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/',
    special: 'Bilingual Welsh/English'
  },
  {
    id: 'globe-midsummer-2025',
    play: "A Midsummer Night's Dream",
    venue: 'globe',
    startDate: '2025-11-15',
    endDate: '2026-01-31',
    director: 'Headlong Theatre',
    description: 'Sam Wanamaker Playhouse production followed by UK tour.',
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/'
  },
  {
    id: 'globe-tempest-2026',
    play: 'The Tempest',
    venue: 'globe',
    startDate: '2026-01-17',
    endDate: '2026-04-12',
    director: 'Tim Crouch',
    description: 'Award-winning theatre maker Tim Crouch directs in the Sam Wanamaker Playhouse.',
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/'
  },
  {
    id: 'globe-romeo-juliet-schools-2026',
    play: 'Romeo and Juliet',
    venue: 'globe',
    startDate: '2026-03-05',
    endDate: '2026-04-12',
    description: 'Playing Shakespeare with Deutsche Bank returns for its 19th year.',
    special: 'Schools Program',
    ticketUrl: 'https://www.shakespearesglobe.com/whats-on/'
  },

  // ===========================
  // RSC 2025-2026
  // ===========================
  {
    id: 'rsc-macbeth-2025',
    play: 'Macbeth',
    venue: 'rsc',
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    director: 'Daniel Raggett',
    cast: ['Sam Heughan', 'Lia Williams'],
    description: "Outlander's Sam Heughan makes his RSC debut opposite Lia Williams as Lady Macbeth in an intimate production at The Other Place.",
    ticketUrl: 'https://www.rsc.org.uk/whats-on',
    highlight: true
  },
  {
    id: 'rsc-henry-v-2025',
    play: 'Henry V',
    venue: 'rsc',
    startDate: '2025-10-01',
    endDate: '2025-12-15',
    director: 'Tamara Harvey',
    cast: ['Alfred Enoch'],
    description: "Alfred Enoch (How to Get Away with Murder) charts the young king's transformation from carefree prince to warrior-monarch.",
    ticketUrl: 'https://www.rsc.org.uk/whats-on',
    highlight: true
  },
  {
    id: 'rsc-tempest-2026',
    play: 'The Tempest',
    venue: 'rsc',
    startDate: '2026-05-13',
    endDate: '2026-06-20',
    director: 'Richard Eyre',
    cast: ['Kenneth Branagh'],
    description: "Kenneth Branagh returns to Stratford-upon-Avon for the first time in over 30 years to play Prospero.",
    ticketUrl: 'https://www.rsc.org.uk/whats-on',
    highlight: true
  },
  {
    id: 'rsc-midsummer-2026',
    play: "A Midsummer Night's Dream",
    venue: 'rsc',
    startDate: '2026-06-19',
    endDate: '2026-08-30',
    director: 'Rachel Bagshaw',
    description: 'Family-friendly production in The Other Place, co-production with the Unicorn Theatre.',
    ticketUrl: 'https://www.rsc.org.uk/whats-on',
    special: 'Family Friendly'
  },

  // ===========================
  // STRATFORD FESTIVAL CANADA 2026
  // ===========================
  {
    id: 'stratford-tempest-2026',
    play: 'The Tempest',
    venue: 'stratfordFestival',
    startDate: '2026-04-20',
    endDate: '2026-11-01',
    director: 'Antoni Cimolino',
    description: "Antoni Cimolino's final Shakespearean production at Stratford - a profound reflection on magic, forgiveness, and legacy.",
    ticketUrl: 'https://www.stratfordfestival.ca/WhatsOn',
    highlight: true
  },
  {
    id: 'stratford-midsummer-2026',
    play: "A Midsummer Night's Dream",
    venue: 'stratfordFestival',
    startDate: '2026-04-20',
    endDate: '2026-11-01',
    director: 'Graham Abbey',
    description: 'Graham Abbey directs this beloved comedy of lovers escaping into a magical forest.',
    ticketUrl: 'https://www.stratfordfestival.ca/WhatsOn'
  },
  {
    id: 'stratford-othello-2026',
    play: 'Othello',
    venue: 'stratfordFestival',
    startDate: '2026-04-20',
    endDate: '2026-11-01',
    director: 'Haysam Kadri',
    description: 'A gripping tragedy exploring the lethal tension between perception and truth.',
    ticketUrl: 'https://www.stratfordfestival.ca/WhatsOn',
    highlight: true
  },

  // ===========================
  // OREGON SHAKESPEARE FESTIVAL 2026
  // ===========================
  {
    id: 'osf-midsummer-2026',
    play: "A Midsummer Night's Dream",
    venue: 'osf',
    startDate: '2026-03-13',
    endDate: '2026-10-25',
    director: 'Marcela Lorca',
    description: "Opening the 2026 season with original music by Justin Huertas.",
    ticketUrl: 'https://www.osfashland.org/tickets-and-calendar',
    highlight: true
  },
  {
    id: 'osf-henry-iv-2026',
    play: 'Henry IV, Part One',
    venue: 'osf',
    startDate: '2026-03-13',
    endDate: '2026-10-25',
    director: 'Rosa Joshi',
    description: 'Sweeping arcs of rebellion and redemption directed by OSF Associate Artistic Director.',
    ticketUrl: 'https://www.osfashland.org/tickets-and-calendar'
  },

  // ===========================
  // FREE SHAKESPEARE IN THE PARK NYC 2026
  // ===========================
  {
    id: 'nyc-romeo-juliet-2026',
    play: 'Romeo and Juliet',
    venue: 'publicTheater',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    director: 'Saheem Ali',
    description: 'Free Shakespeare in Central Park returns with the timeless love story.',
    ticketUrl: 'https://publictheater.org/free-shakespeare-in-the-park/',
    highlight: true,
    special: 'Free Tickets'
  },
  {
    id: 'nyc-winters-tale-2026',
    play: "The Winter's Tale",
    venue: 'publicTheater',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    director: 'Daniel Sullivan',
    description: "Shakespeare's late romance at the Delacorte Theater.",
    ticketUrl: 'https://publictheater.org/free-shakespeare-in-the-park/',
    special: 'Free Tickets'
  },

  // ===========================
  // CHICAGO SHAKESPEARE THEATER 2025-2026
  // ===========================
  {
    id: 'chicago-midsummer-2025',
    play: "A Midsummer Night's Dream",
    venue: 'chicagoShakes',
    startDate: '2025-07-19',
    endDate: '2025-08-17',
    description: "Free performances throughout Chicago green spaces - 'Shakes in the City'",
    ticketUrl: 'https://www.chicagoshakes.com',
    special: 'Free Outdoor'
  },
  {
    id: 'chicago-merry-wives-2026',
    play: 'The Merry Wives of Windsor',
    venue: 'chicagoShakes',
    startDate: '2026-04-02',
    endDate: '2026-05-03',
    director: 'Phillip Breen',
    description: 'RSC Associate Artist Phillip Breen directs this hilarious comedy.',
    ticketUrl: 'https://www.chicagoshakes.com'
  },

  // ===========================
  // UTAH SHAKESPEARE FESTIVAL 2026
  // ===========================
  {
    id: 'utah-troilus-2026',
    play: 'Troilus and Cressida',
    venue: 'utahShakes',
    startDate: '2026-06-18',
    endDate: '2026-09-03',
    description: "Shakespeare's dark comedy in the open-air Engelstad Theatre.",
    ticketUrl: 'https://www.bard.org/calendar/2026/'
  },
  {
    id: 'utah-hamlet-2026',
    play: 'Hamlet',
    venue: 'utahShakes',
    startDate: '2026-06-19',
    endDate: '2026-09-04',
    description: 'The great tragedy under the Utah stars.',
    ticketUrl: 'https://www.bard.org/calendar/2026/',
    highlight: true
  },
  {
    id: 'utah-twelfth-night-2026',
    play: 'Twelfth Night',
    venue: 'utahShakes',
    startDate: '2026-06-20',
    endDate: '2026-09-05',
    description: "Shakespeare's beloved comedy of mistaken identity.",
    ticketUrl: 'https://www.bard.org/calendar/2026/'
  },

  // ===========================
  // COLORADO SHAKESPEARE FESTIVAL 2026
  // ===========================
  {
    id: 'colorado-twelfth-night-2026',
    play: 'Twelfth Night',
    venue: 'coloradoShakes',
    startDate: '2026-06-07',
    endDate: '2026-08-02',
    description: 'Outdoor performance in the newly renovated Mary Rippon Theatre.',
    ticketUrl: 'https://cupresents.org/series/shakespeare-festival/'
  },
  {
    id: 'colorado-julius-caesar-2026',
    play: 'Julius Caesar',
    venue: 'coloradoShakes',
    startDate: '2026-06-07',
    endDate: '2026-08-02',
    description: 'Indoor performance in the Roe Green Theatre.',
    ticketUrl: 'https://cupresents.org/series/shakespeare-festival/'
  },

  // ===========================
  // BELL SHAKESPEARE AUSTRALIA 2026
  // ===========================
  {
    id: 'bell-julius-caesar-2026',
    play: 'Julius Caesar',
    venue: 'bellShakespeare',
    startDate: '2026-03-07',
    endDate: '2026-04-05',
    cast: ['Leon Ford', 'Brigid Zengeni'],
    description: 'Leon Ford as Cassius and Brigid Zengeni as Brutus plot to bring down Caesar.',
    ticketUrl: 'https://www.bellshakespeare.com.au',
    highlight: true
  },
  {
    id: 'bell-macbeth-2026',
    play: 'Macbeth',
    venue: 'bellShakespeare',
    startDate: '2026-05-01',
    endDate: '2026-08-30',
    director: 'Peter Evans',
    description: "Peter Evans' critically acclaimed production returns.",
    ticketUrl: 'https://www.bellshakespeare.com.au'
  }
];

// Helper functions
export function getUpcomingPerformances(fromDate = new Date()) {
  const dateStr = fromDate.toISOString().split('T')[0];
  return PERFORMANCES
    .filter(p => p.endDate >= dateStr)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

export function getPerformancesByRegion(region) {
  return PERFORMANCES.filter(p => VENUES[p.venue]?.region === region);
}

export function getPerformancesByPlay(playName) {
  return PERFORMANCES.filter(p =>
    p.play.toLowerCase().includes(playName.toLowerCase())
  );
}

export function getHighlightedPerformances() {
  return PERFORMANCES.filter(p => p.highlight);
}

export function getVenueInfo(venueId) {
  return VENUES[venueId];
}

export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options = { month: 'short', day: 'numeric' };
  const yearOptions = { year: 'numeric' };

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${startYear}`;
  }
  return `${start.toLocaleDateString('en-US', options)}, ${startYear} - ${end.toLocaleDateString('en-US', options)}, ${endYear}`;
}

// Play categories for filtering
export const PLAY_CATEGORIES = {
  tragedy: ['Hamlet', 'Macbeth', 'Othello', 'King Lear', 'Romeo and Juliet', 'Julius Caesar'],
  comedy: ['A Midsummer Night\'s Dream', 'Twelfth Night', 'The Merry Wives of Windsor', 'As You Like It'],
  history: ['Henry V', 'Henry IV, Part One', 'Richard III', 'Richard II'],
  romance: ['The Tempest', 'The Winter\'s Tale'],
  problem: ['Troilus and Cressida', 'Measure for Measure']
};

export function getPlayCategory(playName) {
  for (const [category, plays] of Object.entries(PLAY_CATEGORIES)) {
    if (plays.some(p => playName.includes(p))) {
      return category;
    }
  }
  return 'other';
}
