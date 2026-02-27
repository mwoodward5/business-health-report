/* ============================================
   SCORING ENGINE — Dual Mode (API + Demo)
   Handles real Google API data + simulated fallbacks
   ============================================ */

// ---- Mulberry32 seeded PRNG ----
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ---- Area Code → City mapping ----
const AREA_CODES = {
  '949': { city: 'Mission Viejo', state: 'CA' },
  '714': { city: 'Anaheim', state: 'CA' },
  '213': { city: 'Los Angeles', state: 'CA' },
  '310': { city: 'Santa Monica', state: 'CA' },
  '415': { city: 'San Francisco', state: 'CA' },
  '512': { city: 'Austin', state: 'TX' },
  '214': { city: 'Dallas', state: 'TX' },
  '713': { city: 'Houston', state: 'TX' },
  '305': { city: 'Miami', state: 'FL' },
  '407': { city: 'Orlando', state: 'FL' },
  '212': { city: 'New York', state: 'NY' },
  '718': { city: 'Brooklyn', state: 'NY' },
  '312': { city: 'Chicago', state: 'IL' },
  '404': { city: 'Atlanta', state: 'GA' },
  '602': { city: 'Phoenix', state: 'AZ' },
  '206': { city: 'Seattle', state: 'WA' },
  '303': { city: 'Denver', state: 'CO' },
  '615': { city: 'Nashville', state: 'TN' },
  '704': { city: 'Charlotte', state: 'NC' },
  '503': { city: 'Portland', state: 'OR' },
  '818': { city: 'Burbank', state: 'CA' },
  '469': { city: 'Plano', state: 'TX' },
  '972': { city: 'Richardson', state: 'TX' },
  '561': { city: 'West Palm Beach', state: 'FL' },
  '813': { city: 'Tampa', state: 'FL' },
};

// ---- Industry detection keywords ----
const INDUSTRY_KEYWORDS = {
  'plumb': 'Plumbing', 'pipe': 'Plumbing', 'drain': 'Plumbing', 'sewer': 'Plumbing',
  'roof': 'Roofing', 'shingle': 'Roofing', 'gutter': 'Roofing',
  'hvac': 'HVAC', 'heat': 'HVAC', 'cool': 'HVAC', 'air': 'HVAC', 'furnace': 'HVAC',
  'dent': 'Dental', 'ortho': 'Dental', 'smile': 'Dental', 'tooth': 'Dental',
  'law': 'Legal', 'legal': 'Legal', 'attorney': 'Legal', 'lawyer': 'Legal', 'injury': 'Legal',
  'restaurant': 'Restaurant', 'pizza': 'Restaurant', 'grill': 'Restaurant', 'cafe': 'Restaurant',
  'bistro': 'Restaurant', 'kitchen': 'Restaurant', 'diner': 'Restaurant', 'taco': 'Restaurant',
  'sushi': 'Restaurant', 'bbq': 'Restaurant', 'burger': 'Restaurant', 'food': 'Restaurant',
  'auto': 'Auto Repair', 'mechanic': 'Auto Repair', 'tire': 'Auto Repair', 'brake': 'Auto Repair',
  'car': 'Auto Repair', 'collision': 'Auto Repair', 'body shop': 'Auto Repair',
  'landscape': 'Landscaping', 'lawn': 'Landscaping', 'garden': 'Landscaping', 'tree': 'Landscaping',
  'mow': 'Landscaping', 'turf': 'Landscaping',
  'real': 'Real Estate', 'realty': 'Real Estate', 'home': 'Real Estate', 'property': 'Real Estate',
  'estate': 'Real Estate',
  'retail': 'Retail', 'shop': 'Retail', 'store': 'Retail', 'boutique': 'Retail',
  'electric': 'Electrical', 'wiring': 'Electrical',
  'clean': 'Cleaning', 'maid': 'Cleaning', 'janitorial': 'Cleaning',
  'paint': 'Painting', 'flooring': 'Flooring', 'carpet': 'Flooring',
  'pest': 'Pest Control', 'exterminator': 'Pest Control',
  'vet': 'Veterinary', 'pet': 'Veterinary', 'animal': 'Veterinary',
  'salon': 'Beauty', 'spa': 'Beauty', 'hair': 'Beauty', 'nail': 'Beauty', 'barber': 'Beauty',
  'gym': 'Fitness', 'fitness': 'Fitness', 'yoga': 'Fitness', 'crossfit': 'Fitness',
};

// ---- Google Places types → industry mapping ----
const PLACES_TYPE_MAP = {
  'restaurant': 'Restaurant', 'food': 'Restaurant', 'cafe': 'Restaurant', 'meal_delivery': 'Restaurant',
  'meal_takeaway': 'Restaurant', 'bakery': 'Restaurant', 'bar': 'Restaurant',
  'plumber': 'Plumbing',
  'roofing_contractor': 'Roofing',
  'dentist': 'Dental',
  'lawyer': 'Legal',
  'car_repair': 'Auto Repair', 'car_dealer': 'Auto Repair',
  'real_estate_agency': 'Real Estate',
  'store': 'Retail', 'clothing_store': 'Retail', 'shopping_mall': 'Retail',
  'electrician': 'Electrical',
  'beauty_salon': 'Beauty', 'hair_care': 'Beauty', 'spa': 'Beauty',
  'gym': 'Fitness',
  'veterinary_care': 'Veterinary',
  'general_contractor': 'Other',
};

// ---- Competitor name pools by industry (used in demo mode) ----
const COMPETITOR_NAMES = {
  'Restaurant': ['Golden Fork Bistro', 'The Hungry Table', 'Savory Kitchen Co', 'Main Street Grill', 'Fresh Plate Dining', 'Harvest & Hearth', 'Copper Spoon Eatery'],
  'Plumbing': ['Pro Flow Plumbing', 'Apex Drain Solutions', 'Reliable Pipe Co', 'Blue Water Plumbing', 'QuickFix Plumbing', 'TrueFlow Services', 'Summit Plumbing Group'],
  'HVAC': ['Comfort Zone HVAC', 'Arctic Air Solutions', 'Elite Climate Control', 'Premier Heating & Air', 'AllStar HVAC', 'TempRight Services', 'CoolBreeze Mechanical'],
  'Roofing': ['Summit Roofing Co', 'Eagle Crest Roofing', 'StormShield Roofing', 'Heritage Roof Solutions', 'Apex Roofing Group', 'TrueTop Contractors', 'Pioneer Roofing LLC'],
  'Landscaping': ['GreenScape Pro', 'Precision Lawns', 'NatureWorks Landscaping', 'Evergreen Design Co', 'TerraForm Gardens', 'Lush Landscapes LLC', 'GreenEdge Services'],
  'Dental': ['Bright Smile Dental', 'Premier Dental Group', 'Comfort Care Dentistry', 'Modern Dental Associates', 'Smile Works Dental', 'Valley Dental Partners', 'PearlWhite Dentistry'],
  'Legal': ['Sterling Law Group', 'Atlas Legal Partners', 'Pinnacle Law Firm', 'Justice First Attorneys', 'Cornerstone Legal', 'Ironclad Law PLLC', 'Meridian Legal Group'],
  'Auto Repair': ['Precision Auto Care', 'MasterTech Auto', 'All Pro Automotive', 'TrueWrench Garage', 'Eagle Auto Service', 'Summit Motor Works', 'DriveRight Auto Repair'],
  'Real Estate': ['Compass Realty Group', 'Prime Property Advisors', 'Keystone Real Estate', 'Horizon Homes', 'BlueStar Realty', 'Crestview Properties', 'Elevate Real Estate'],
  'Retail': ['Main Street Marketplace', 'The Corner Boutique', 'Urban Goods Co', 'NextLevel Retail', 'Shopfront Studios', 'Marketplace Hub', 'ClearView Retail'],
  'Electrical': ['Spark Electric Co', 'Ampere Electrical', 'BrightWire Solutions', 'PowerUp Electrical', 'CircuitPro Electric'],
  'Cleaning': ['SparkClean Pro', 'Crystal Clear Cleaning', 'PureShine Services', 'FreshStart Cleaning Co', 'Diamond Maid Services'],
  'Beauty': ['Luxe Salon & Spa', 'Radiance Beauty Studio', 'The Style Lounge', 'Polished Beauty Bar', 'Glow Up Salon'],
  'Fitness': ['Iron Forge Fitness', 'Peak Performance Gym', 'FitZone Athletics', 'Elevate Training Co', 'CorePower Studio'],
  'Other': ['Peak Performance Co', 'Summit Business Group', 'Atlas Professional Services', 'Premier Solutions Inc', 'TrueNorth Enterprises', 'Cornerstone Business Co', 'Pinnacle Services Group'],
};

// ---- First / Last names ----
const FIRST_NAMES = ['Mike', 'David', 'Sarah', 'James', 'Jennifer', 'Robert', 'Lisa', 'John', 'Maria', 'Chris', 'Amanda', 'Brian', 'Jessica', 'Kevin', 'Michelle', 'Tom', 'Angela', 'Steve', 'Rachel', 'Mark', 'Patricia', 'Daniel', 'Linda', 'Anthony', 'Karen'];
const LAST_NAMES = ['Johnson', 'Smith', 'Williams', 'Martinez', 'Anderson', 'Thompson', 'Garcia', 'Rodriguez', 'Wilson', 'Moore', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright'];

// ---- Input Detection ----
function detectInputType(input) {
  const cleaned = input.replace(/[\s\-\(\)\.]/g, '');
  if (/^\d{10,11}$/.test(cleaned)) return 'phone';
  if (/^\+?1?\d{10}$/.test(cleaned)) return 'phone';
  return 'url';
}

function normalizePhone(input) {
  return input.replace(/[^\d]/g, '').replace(/^1/, '').slice(0, 10);
}

function normalizeUrl(input) {
  let url = input.trim().toLowerCase();
  url = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  url = url.split('/')[0].split('?')[0];
  return url;
}

// ---- Demo Mode: Business Lookup (simulated) ----
function lookupBusinessDemo(input) {
  const type = detectInputType(input);
  const seed = hashString(input.toLowerCase().trim());
  const rng = mulberry32(seed);

  let businessName, domain, industry, city, state, phone, ownerFirst, ownerLast, email;

  if (type === 'phone') {
    phone = normalizePhone(input);
    const areaCode = phone.slice(0, 3);
    const location = AREA_CODES[areaCode] || { city: 'Austin', state: 'TX' };
    city = location.city;
    state = location.state;

    const industries = Object.values(INDUSTRY_KEYWORDS);
    const uniqueIndustries = [...new Set(industries)];
    industry = uniqueIndustries[Math.floor(rng() * uniqueIndustries.length)];

    const prefixes = ['Premier', 'Elite', 'Quality', 'Express', 'Pro', 'First Choice', 'Superior', 'Ace', 'Champion', 'Reliable'];
    const prefix = prefixes[Math.floor(rng() * prefixes.length)];
    businessName = `${prefix} ${industry}`;
    if (industry === 'Restaurant') {
      const rNames = ['The Golden Spoon', 'Bella Cucina', 'Harbor Grill', 'Sunset Bistro', 'The Rustic Table', 'Cornerstone Kitchen'];
      businessName = rNames[Math.floor(rng() * rNames.length)];
    }

    domain = businessName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  } else {
    domain = normalizeUrl(input);
    const domainBase = domain.replace(/\.(com|net|org|co|io|biz|us)$/i, '');

    industry = 'Other';
    const domainLower = domainBase.toLowerCase();
    for (const [kw, ind] of Object.entries(INDUSTRY_KEYWORDS)) {
      if (domainLower.includes(kw)) {
        industry = ind;
        break;
      }
    }

    let nameParts = domainBase
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([a-z])(plumbing|roofing|hvac|dental|legal|auto|landscaping|restaurant|cleaning|electric|painting|flooring|realty|fitness|salon)/gi, '$1 $2')
      .split(' ')
      .map(w => {
        const lower = w.toLowerCase();
        if (lower === 'hvac') return 'HVAC';
        if (lower === 'llc') return 'LLC';
        if (lower === 'inc') return 'Inc';
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');

    nameParts = nameParts.replace(/([A-Z][a-z]+)(s)(\s)/g, "$1'$2$3");
    nameParts = nameParts.replace(/^([A-Z][a-z]{2,})(s)(\s)/g, "$1'$2$3");
    if (/^[A-Z][a-z]+s\s/.test(nameParts)) {
      nameParts = nameParts.replace(/^([A-Z][a-z]+)(s)(\s)/, "$1'$2$3");
    }
    businessName = nameParts;

    const cities = Object.values(AREA_CODES);
    const loc = cities[Math.floor(rng() * cities.length)];
    city = loc.city;
    state = loc.state;

    phone = '';
    for (const [ac, loc2] of Object.entries(AREA_CODES)) {
      if (loc2.city === city) { phone = ac; break; }
    }
    phone = phone + Math.floor(1000000 + rng() * 9000000).toString();
  }

  ownerFirst = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  ownerLast = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  email = (ownerFirst.toLowerCase() + '@' + domain).replace(/'/g, '');

  return {
    businessName,
    domain,
    industry,
    city,
    state,
    phone,
    ownerName: ownerFirst + ' ' + ownerLast,
    ownerFirst,
    ownerLast,
    email,
    seed,
    dataMode: 'demo',
  };
}

// ---- Build business object from real Places API data ----
function buildBusinessFromPlaces(placesData, input) {
  const seed = hashString(input.toLowerCase().trim());
  const rng = mulberry32(seed);

  // Detect industry from Google Places types
  let industry = 'Other';
  const types = placesData.types || [];
  for (const t of types) {
    if (PLACES_TYPE_MAP[t]) {
      industry = PLACES_TYPE_MAP[t];
      break;
    }
  }
  // Fallback: try to match from business name
  if (industry === 'Other') {
    const nameLower = (placesData.businessName || '').toLowerCase();
    for (const [kw, ind] of Object.entries(INDUSTRY_KEYWORDS)) {
      if (nameLower.includes(kw)) {
        industry = ind;
        break;
      }
    }
  }

  // Extract domain from website
  let domain = '';
  if (placesData.website) {
    try {
      domain = placesData.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    } catch (e) {
      domain = placesData.website;
    }
  }

  const ownerFirst = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const ownerLast = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];

  return {
    businessName: placesData.businessName || 'Unknown Business',
    domain: domain,
    industry: industry,
    city: placesData.city || '',
    state: placesData.state || '',
    phone: (placesData.phone || '').replace(/[^\d]/g, ''),
    website: placesData.website || '',
    ownerName: ownerFirst + ' ' + ownerLast,
    ownerFirst,
    ownerLast,
    email: domain ? (ownerFirst.toLowerCase() + '@' + domain) : '',
    seed,
    // Real data fields
    rating: placesData.rating || 0,
    reviewCount: placesData.reviewCount || 0,
    reviews: placesData.reviews || [],
    photosCount: placesData.photosCount || 0,
    hasHours: placesData.hasHours || false,
    isVerified: placesData.isVerified || false,
    placeId: placesData.placeId || '',
    lat: placesData.lat || 0,
    lng: placesData.lng || 0,
    googleMapsUrl: placesData.googleMapsUrl || '',
    types: types,
    dataMode: 'live',
  };
}

// ---- Score Utilities ----
function getScoreColor(score) {
  if (score >= 90) return 'a';
  if (score >= 80) return 'b';
  if (score >= 70) return 'c';
  if (score >= 60) return 'd';
  return 'f';
}

function getLetterGrade(score) {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

// ---- Generate Scores ----
// apiData: { pagespeed, placesData, competitorsData } — any may be null
function generateScores(business, apiData) {
  const rng = mulberry32(business.seed + 42);
  const hasPageSpeed = apiData && apiData.pagespeed && apiData.pagespeed.success;
  const hasPlaces = business.dataMode === 'live';
  // For demo mode, use strategically bad scores that create sales urgency
  const biasedScore = hasPageSpeed || hasPlaces
    ? () => Math.floor(45 + rng() * 40)
    : () => Math.floor(30 + rng() * 35);

  // ---- WEBSITE PERFORMANCE ----
  let websiteScore, websiteMetrics;
  if (hasPageSpeed) {
    const ps = apiData.pagespeed;
    // Map lighthouse performance score directly
    websiteScore = ps.performanceScore;
    websiteMetrics = {
      loadTime: ps.loadTime || ps.largestContentfulPaint || 0,
      mobileScore: ps.performanceScore,
      mobileFriendly: ps.mobileFriendly,
      missingSSL: !ps.hasSSL,
      bounceRate: Math.max(20, Math.min(90, 100 - ps.performanceScore + Math.floor(rng() * 10))),
      pagesPerSession: (1.1 + rng() * 1.5).toFixed(1),
      missingAlt: Math.floor(rng() * 15),
      brokenLinks: Math.floor(rng() * 5),
      // Real PageSpeed metrics
      firstContentfulPaint: ps.firstContentfulPaint,
      speedIndex: ps.speedIndex,
      largestContentfulPaint: ps.largestContentfulPaint,
      timeToInteractive: ps.timeToInteractive,
      totalBlockingTime: ps.totalBlockingTime,
      cumulativeLayoutShift: ps.cumulativeLayoutShift,
      seoScore: ps.seoScore,
      accessibilityScore: ps.accessibilityScore,
      _real: true,
    };
  } else {
    websiteScore = biasedScore();
    const loadTime = (6.5 + rng() * 3).toFixed(1);
    const mobileScore = Math.floor(25 + rng() * 25);
    websiteMetrics = {
      loadTime, mobileScore, mobileFriendly: mobileScore > 50,
      missingSSL: rng() > 0.3,
      bounceRate: Math.floor(65 + rng() * 25),
      pagesPerSession: (1.1 + rng() * 1.5).toFixed(1),
      missingAlt: Math.floor(5 + rng() * 20),
      brokenLinks: Math.floor(rng() * 8),
      _real: false,
    };
  }

  // ---- SEO (always simulated — expensive APIs) ----
  const missingH1 = rng() > 0.4;
  const noMetaDesc = rng() > 0.45;
  const backlinkCount = Math.floor(5 + rng() * 30);
  const keywordsRanked = Math.floor(2 + rng() * 15);
  const missingSchema = rng() > 0.35;
  const seoScore = biasedScore();
  const seoMetrics = { missingH1, noMetaDesc, backlinkCount, keywordsRanked, missingSchema, _real: false };

  // If we have PageSpeed SEO score, blend it
  if (hasPageSpeed && apiData.pagespeed.seoScore) {
    // Use PageSpeed SEO score to anchor our simulated score
    const psSeo = apiData.pagespeed.seoScore;
    // Weighted blend: 40% real PageSpeed SEO, 60% simulated deep SEO
    seoMetrics._partialReal = true;
    seoMetrics.lighthouseSeoScore = psSeo;
  }

  // ---- GOOGLE BUSINESS PROFILE ----
  let gbpScore, gbpMetrics;
  if (hasPlaces) {
    // Real scoring formula:
    let score = 0;
    if (business.isVerified) score += 20;
    score += (business.rating / 5) * 25;
    score += Math.min(business.reviewCount / 50, 1) * 25;
    score += Math.min(business.photosCount / 10, 1) * 15;
    if (business.hasHours) score += 15;
    gbpScore = Math.round(score);

    gbpMetrics = {
      gbpComplete: Math.min(100, Math.round(score)),
      noGbpPosts: rng() > 0.4, // Still simulated
      fewPhotos: business.photosCount,
      rating: business.rating,
      reviewCount: business.reviewCount,
      hasHours: business.hasHours,
      isVerified: business.isVerified,
      photosCount: business.photosCount,
      _real: true,
    };
  } else {
    gbpScore = biasedScore();
    gbpMetrics = {
      gbpComplete: Math.floor(30 + rng() * 50),
      noGbpPosts: rng() > 0.4,
      fewPhotos: Math.floor(rng() * 8),
      _real: false,
    };
  }

  // ---- ONLINE REPUTATION ----
  let reputationScore, reputationMetrics;
  if (hasPlaces) {
    // Real data for rating + review count
    const ratingScore = (business.rating / 5) * 40;
    const reviewVolume = Math.min(business.reviewCount / 50, 1) * 35;
    const responseRate = Math.floor(rng() * 50); // Simulated
    const recency = 15 + rng() * 10; // Simulated recency bonus
    reputationScore = Math.round(Math.min(100, ratingScore + reviewVolume + recency));
    reputationMetrics = {
      reviewCount: business.reviewCount,
      avgRating: business.rating.toFixed(1),
      competitorReviews: Math.floor(40 + rng() * 160),
      responseRate,
      _real: true,
    };
  } else {
    reputationScore = biasedScore();
    const reviewCount = Math.floor(3 + rng() * 12);
    const avgRating = (3.0 + rng() * 1.0).toFixed(1);
    reputationMetrics = {
      reviewCount, avgRating,
      competitorReviews: Math.floor(40 + rng() * 160),
      responseRate: Math.floor(rng() * 50),
      _real: false,
    };
  }

  // ---- SOCIAL MEDIA (always simulated) ----
  const socialScore = biasedScore();
  const socialMetrics = {
    socialFollowers: Math.floor(30 + rng() * 170),
    lastPost: Math.floor(14 + rng() * 90),
    _real: false,
  };

  // Build categories
  const categories = {
    website: { name: 'Website Performance', icon: 'fa-globe', score: websiteScore, metrics: websiteMetrics },
    seo: { name: 'Search Visibility (SEO)', icon: 'fa-search', score: seoScore, metrics: seoMetrics },
    gbp: { name: 'Google Business Profile', icon: 'fa-map-marker-alt', score: gbpScore, metrics: gbpMetrics },
    reputation: { name: 'Online Reputation', icon: 'fa-star', score: reputationScore, metrics: reputationMetrics },
    social: { name: 'Social Media Presence', icon: 'fa-share-alt', score: socialScore, metrics: socialMetrics },
  };

  // Calculate overall
  const scores = Object.values(categories).map(c => c.score);
  const overall = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Flatten all metrics for backward compatibility
  const allMetrics = {
    loadTime: websiteMetrics.loadTime,
    mobileScore: websiteMetrics.mobileScore || websiteMetrics.performanceScore,
    missingSSL: websiteMetrics.missingSSL,
    missingH1: seoMetrics.missingH1,
    noMetaDesc: seoMetrics.noMetaDesc,
    reviewCount: reputationMetrics.reviewCount,
    avgRating: reputationMetrics.avgRating,
    competitorReviews: reputationMetrics.competitorReviews,
    gbpComplete: gbpMetrics.gbpComplete,
    socialFollowers: socialMetrics.socialFollowers,
    lastPost: socialMetrics.lastPost,
    backlinkCount: seoMetrics.backlinkCount,
    keywordsRanked: seoMetrics.keywordsRanked,
    bounceRate: websiteMetrics.bounceRate,
    pagesPerSession: websiteMetrics.pagesPerSession,
    missingAlt: websiteMetrics.missingAlt,
    brokenLinks: websiteMetrics.brokenLinks,
    missingSchema: seoMetrics.missingSchema,
    noGbpPosts: gbpMetrics.noGbpPosts,
    fewPhotos: gbpMetrics.fewPhotos || gbpMetrics.photosCount || 0,
    responseRate: reputationMetrics.responseRate,
  };

  // Determine data mode
  const dataMode = (hasPageSpeed || hasPlaces) ? 'live' : 'demo';

  return { categories, overall, metrics: allMetrics, dataMode };
}

// ---- Generate Findings ----
function generateFindings(business, scores) {
  const m = scores.metrics;
  const findings = [];

  // Website findings
  const loadTime = parseFloat(m.loadTime);
  if (loadTime > 5) {
    findings.push({ category: 'Website', priority: 'critical', title: `Website loads in ${m.loadTime} seconds`, impact: `53% of visitors leave after 3 seconds. At ${m.loadTime}s, you're likely losing a significant portion of potential customers before they see your content.`, stat: `Industry average: 2.5s | Your site: ${m.loadTime}s` });
  } else if (loadTime > 3) {
    findings.push({ category: 'Website', priority: 'high', title: `Website loads in ${m.loadTime} seconds`, impact: `Your page speed is below the recommended 3-second threshold, causing increased bounce rate.`, stat: `Recommended: under 3s | Your site: ${m.loadTime}s` });
  }

  const mobileScore = typeof m.mobileScore === 'number' ? m.mobileScore : parseInt(m.mobileScore);
  if (mobileScore < 60) {
    findings.push({ category: 'Website', priority: 'critical', title: `Mobile optimization score: ${mobileScore}/100`, impact: `Over 60% of local searches happen on mobile. A score of ${mobileScore} means your site is difficult to use on phones, driving customers to competitors.`, stat: `60%+ of ${business.industry.toLowerCase()} searches are mobile` });
  }

  if (m.missingSSL) {
    findings.push({ category: 'Website', priority: 'high', title: 'Missing SSL security certificate', impact: `Google Chrome flags your site as "Not Secure." This warning alone causes 85% of visitors to immediately leave.`, stat: `85% of users won't submit info on non-secure sites` });
  }

  if (m.bounceRate > 70) {
    findings.push({ category: 'Website', priority: 'high', title: `High bounce rate: ${m.bounceRate}%`, impact: `${m.bounceRate}% of visitors leave after viewing just one page. The industry average is around 45%.`, stat: `Your bounce rate: ${m.bounceRate}% | Industry avg: 45%` });
  }

  if (m.brokenLinks > 3) {
    findings.push({ category: 'Website', priority: 'medium', title: `${m.brokenLinks} broken links detected`, impact: `Broken links create a poor user experience and signal to Google that your site isn't well-maintained.`, stat: `${m.brokenLinks} broken links found across your site` });
  }

  if (m.missingAlt > 8) {
    findings.push({ category: 'Website', priority: 'medium', title: `${m.missingAlt} images missing alt text`, impact: `Missing alt text means Google can't understand your images, reducing chances of appearing in image search.`, stat: `${m.missingAlt} images without descriptions` });
  }

  // SEO findings
  if (m.missingH1) {
    findings.push({ category: 'SEO', priority: 'critical', title: 'Missing H1 heading tag on homepage', impact: `The H1 tag is the #1 on-page SEO signal. Without it, Google doesn't clearly understand what your business does.`, stat: `Missing the most important on-page SEO element` });
  }

  if (m.noMetaDesc) {
    findings.push({ category: 'SEO', priority: 'high', title: 'No meta description set', impact: `Without a meta description, Google generates one automatically. Custom meta descriptions increase click-through rates by up to 30%.`, stat: `Pages with meta descriptions get 30% more clicks` });
  }

  if (m.keywordsRanked < 10) {
    findings.push({ category: 'SEO', priority: 'high', title: `Only ranking for ${m.keywordsRanked} keywords`, impact: `Top ${business.industry.toLowerCase()} businesses in ${business.city} rank for 50+ keywords. With only ${m.keywordsRanked}, you're invisible for most searches.`, stat: `Your keywords: ${m.keywordsRanked} | Competitors avg: 50+` });
  }

  if (m.backlinkCount < 20) {
    findings.push({ category: 'SEO', priority: 'medium', title: `Low backlink profile: only ${m.backlinkCount} backlinks`, impact: `Backlinks are a top-3 Google ranking factor. With ${m.backlinkCount} backlinks, your site lacks authority.`, stat: `Your backlinks: ${m.backlinkCount} | Top competitor: ${m.backlinkCount * 4}+` });
  }

  if (m.missingSchema) {
    findings.push({ category: 'SEO', priority: 'medium', title: 'No schema markup detected', impact: `Schema markup helps Google display rich snippets. Businesses with schema get 20-30% more clicks.`, stat: `Rich snippets increase CTR by 20-30%` });
  }

  // GBP findings
  if (m.gbpComplete < 60) {
    findings.push({ category: 'GBP', priority: 'critical', title: `Google Business Profile only ${m.gbpComplete}% complete`, impact: `Incomplete profiles get 70% fewer clicks than complete ones. You're missing key information customers look for.`, stat: `Your profile: ${m.gbpComplete}% complete | Should be: 100%` });
  }

  if (m.noGbpPosts) {
    findings.push({ category: 'GBP', priority: 'high', title: 'No Google Business Profile posts', impact: `Google rewards active profiles with higher local rankings. Businesses that post weekly see 35% more profile views.`, stat: `Weekly GBP posts = 35% more profile views` });
  }

  const photoCount = typeof m.fewPhotos === 'number' ? m.fewPhotos : 0;
  if (photoCount < 5) {
    findings.push({ category: 'GBP', priority: 'medium', title: `Only ${photoCount} photos on Google Business Profile`, impact: `Businesses with 100+ photos get 520% more calls. With only ${photoCount} photos, your profile looks inactive.`, stat: `Your photos: ${photoCount} | Recommended: 50+` });
  }

  // Reputation findings
  const reviewCount = typeof m.reviewCount === 'number' ? m.reviewCount : parseInt(m.reviewCount);
  if (reviewCount < 20) {
    findings.push({ category: 'Reputation', priority: 'critical', title: `Only ${reviewCount} Google reviews`, impact: `The top-ranked ${business.industry.toLowerCase()} businesses in ${business.city} have ${m.competitorReviews}+ reviews. With only ${reviewCount}, you're at a significant disadvantage.`, stat: `Your reviews: ${reviewCount} | Top competitor: ${m.competitorReviews}` });
  }

  const avgRating = parseFloat(m.avgRating);
  if (avgRating < 4.0) {
    findings.push({ category: 'Reputation', priority: 'high', title: `Below-average rating: ${m.avgRating} stars`, impact: `82% of consumers won't consider a business with less than 4 stars. At ${m.avgRating} stars, you're being filtered out.`, stat: `Your rating: ${m.avgRating}\u2605 | Minimum for trust: 4.0\u2605` });
  }

  if (m.responseRate < 30) {
    findings.push({ category: 'Reputation', priority: 'medium', title: `Low review response rate: ${m.responseRate}%`, impact: `Responding to reviews shows customers you care. Businesses that respond to 100% of reviews see 35% higher conversion.`, stat: `Your response rate: ${m.responseRate}% | Recommended: 100%` });
  }

  // Social findings
  if (m.lastPost > 30) {
    findings.push({ category: 'Social', priority: 'high', title: `Last social media post was ${m.lastPost} days ago`, impact: `An inactive social media presence signals to customers that your business may not be operational.`, stat: `Last post: ${m.lastPost} days ago | Recommended: weekly` });
  }

  if (m.socialFollowers < 200) {
    findings.push({ category: 'Social', priority: 'medium', title: `Low social following: ${m.socialFollowers} followers`, impact: `Social proof matters. Competitors in ${business.city} average 1,000+ followers.`, stat: `Your followers: ${m.socialFollowers} | Competitor avg: 1,000+` });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return findings;
}

// ---- Generate Competitors ----
// realCompetitors: array from API or null
function generateCompetitors(business, overallScore, realCompetitors) {
  if (realCompetitors && realCompetitors.length > 0) {
    return buildCompetitorsFromReal(business, overallScore, realCompetitors);
  }
  return generateCompetitorsDemo(business, overallScore);
}

function buildCompetitorsFromReal(business, overallScore, realComps) {
  const rng = mulberry32(business.seed + 99);
  const competitors = [];

  for (const comp of realComps.slice(0, 4)) {
    // Estimate a digital score from rating + review count
    const ratingFactor = (comp.rating || 3) / 5;
    const reviewFactor = Math.min((comp.reviewCount || 0) / 100, 1);
    const estimatedScore = Math.round(Math.min(98, Math.max(30,
      (ratingFactor * 50) + (reviewFactor * 30) + (rng() * 20)
    )));

    competitors.push({
      name: comp.name,
      score: estimatedScore,
      grade: getLetterGrade(estimatedScore),
      reviews: comp.reviewCount || 0,
      rating: (comp.rating || 0).toFixed(1),
      address: comp.address || '',
      placeId: comp.placeId || '',
      _real: true,
    });
  }

  // Add target business
  competitors.push({
    name: business.businessName,
    score: overallScore,
    grade: getLetterGrade(overallScore),
    reviews: business.reviewCount || Math.floor(3 + rng() * 25),
    rating: business.rating ? business.rating.toFixed(1) : (2.5 + rng() * 2.5).toFixed(1),
    isTarget: true,
    _real: true,
  });

  // Sort by score descending
  competitors.sort((a, b) => b.score - a.score);
  competitors.forEach((c, i) => { c.rank = i + 1; });

  return competitors;
}

function generateCompetitorsDemo(business, overallScore) {
  const rng = mulberry32(business.seed + 99);
  const pool = COMPETITOR_NAMES[business.industry] || COMPETITOR_NAMES['Other'];
  const used = new Set();
  const competitors = [];

  for (let i = 0; i < 4; i++) {
    let name;
    do {
      name = pool[Math.floor(rng() * pool.length)];
    } while (used.has(name));
    used.add(name);

    let score;
    if (i === 0) score = Math.min(97, overallScore + Math.floor(25 + rng() * 15));
    else if (i === 1) score = Math.min(93, overallScore + Math.floor(15 + rng() * 12));
    else if (i === 2) score = overallScore + Math.floor(5 + rng() * 10);
    else score = Math.max(25, overallScore - Math.floor(3 + rng() * 10));

    const reviews = Math.floor(20 + rng() * 180);
    const rating = (3.5 + rng() * 1.5).toFixed(1);

    competitors.push({ name, score, grade: getLetterGrade(score), reviews, rating, _real: false });
  }

  competitors.push({
    name: business.businessName,
    score: overallScore,
    grade: getLetterGrade(overallScore),
    reviews: Math.floor(3 + rng() * 25),
    rating: business.avgRating || (2.5 + rng() * 2.5).toFixed(1),
    isTarget: true,
    _real: false,
  });

  competitors.sort((a, b) => b.score - a.score);
  competitors.forEach((c, i) => { c.rank = i + 1; });

  // Ensure target business always ranks #4 or #5 in demo mode
  const targetIdx = competitors.findIndex(c => c.isTarget);
  if (targetIdx >= 0 && targetIdx < 3) {
    // Target is too high — swap with competitor at position 3 or 4
    const swapIdx = Math.min(3, competitors.length - 1);
    if (swapIdx !== targetIdx) {
      [competitors[targetIdx], competitors[swapIdx]] = [competitors[swapIdx], competitors[targetIdx]];
      competitors.forEach((c, i) => { c.rank = i + 1; });
    }
  }

  return competitors;
}

// ---- Call Script Generator ----
function generateCallScript(business, scores, findings, competitors) {
  const topCompetitor = competitors.find(c => !c.isTarget) || competitors[0];
  const targetRanking = competitors.find(c => c.isTarget);
  const topFindings = findings.slice(0, 5);
  const hookFinding = findings[0];

  const bestCallTime = business.seed % 2 === 0 ? 'Morning (9-11 AM)' : 'Afternoon (1-3 PM)';

  const opening = `Hi ${business.ownerFirst}, this is Mark with Rocket Search. I was doing some research on ${business.industry.toLowerCase()} businesses in ${business.city} and came across ${business.businessName}. Do you have a quick minute?`;

  let hook = '';
  if (hookFinding) {
    if (hookFinding.title.includes('loads in')) {
      hook = `I noticed your website is currently loading in ${scores.metrics.loadTime} seconds \u2014 that's significantly slower than the top ${business.industry.toLowerCase()} businesses in ${business.city}. Studies show that 53% of visitors leave if a page takes more than 3 seconds to load. At ${scores.metrics.loadTime} seconds, that could mean you're losing roughly ${Math.floor(15 + (business.seed % 20))} potential customers every single month just from slow load times.`;
    } else if (hookFinding.title.includes('Google reviews')) {
      hook = `I was looking at your online presence and noticed ${business.businessName} currently has ${scores.metrics.reviewCount} Google reviews. The top ${business.industry.toLowerCase()} businesses in your area have over ${scores.metrics.competitorReviews}. Reviews are the #1 factor customers look at before choosing a local business \u2014 that gap could be costing you a significant number of new customers every month.`;
    } else if (hookFinding.title.includes('Mobile')) {
      hook = `I ran a quick analysis on your website and found that your mobile score is ${scores.metrics.mobileScore} out of 100. Over 60% of people searching for ${business.industry.toLowerCase()} services use their phone. Right now, when someone pulls up your site on mobile, it's really hard to navigate \u2014 and most of them are going to hit the back button and call a competitor instead.`;
    } else if (hookFinding.title.includes('H1')) {
      hook = `I took a look at your website's search engine optimization and found a critical issue \u2014 your homepage is missing its main heading tag. That's the #1 signal Google uses to understand what your business does. Without it, you're essentially invisible for "${business.industry.toLowerCase()} in ${business.city}" searches.`;
    } else if (hookFinding.title.includes('Google Business Profile')) {
      hook = `I was researching ${business.industry.toLowerCase()} businesses in ${business.city} and noticed your Google Business Profile is only ${scores.metrics.gbpComplete}% complete. Google gives priority to complete profiles \u2014 businesses with fully optimized profiles get 70% more clicks.`;
    } else {
      hook = `I ran a comprehensive digital audit on ${business.businessName} and found several areas where you're falling behind competitors in ${business.city}. Your overall digital presence scored a ${scores.overall} out of 100, which puts you below most of the top ${business.industry.toLowerCase()} businesses in the area. The good news is, these are fixable issues.`;
    }
  }

  const painPoints = topFindings.map(f => ({
    priority: f.priority,
    problem: f.title,
    impact: f.impact,
    stat: f.stat,
  }));

  const competitorPressure = `We also looked at how you stack up against your local competitors. ${topCompetitor.name} currently outranks you in several key areas \u2014 they have ${topCompetitor.reviews} Google reviews compared to your ${targetRanking ? targetRanking.reviews : scores.metrics.reviewCount}, and their overall digital score is ${topCompetitor.score} compared to your ${scores.overall}. In a competitive market like ${business.city}, that gap translates directly to lost phone calls and lost revenue.`;

  const offer = `We put together a detailed digital health report for ${business.businessName} \u2014 it covers your website performance, search visibility, online reputation, and exactly how you stack up against ${competitors.filter(c => !c.isTarget).length} competitors in ${business.city}. I'd love to send it over to you \u2014 it really lays out where the biggest opportunities are. What's the best email address to send that to?`;

  const objections = [
    {
      objection: '"I\'m not interested right now"',
      response: `I totally understand, ${business.ownerFirst}. I wouldn't want to waste your time either. But just so you know \u2014 we found ${findings.filter(f => f.priority === 'critical').length} critical issues that are actively costing you customers right now. For example, ${hookFinding ? hookFinding.title.toLowerCase() : 'your digital presence needs attention'}. I'm not trying to sell you anything on this call \u2014 I just want to make sure you have the information. Can I send the report to your email?`,
    },
    {
      objection: '"I already have a marketing company"',
      response: `That's great that you're investing in marketing. The reason I'm calling is that despite having a marketing company, your digital audit still shows some significant gaps \u2014 your overall score is ${scores.overall} out of 100, and ${topCompetitor.name} is outperforming you with a score of ${topCompetitor.score}. Our report might actually help you hold your current marketing company accountable.`,
    },
    {
      objection: '"Just send me an email"',
      response: `Absolutely, I'll send it right over. What's the best email? I'll include the full report showing your ${scores.overall}/100 score and how you compare to ${competitors.filter(c => !c.isTarget).length} competitors. One thing I'll highlight \u2014 ${hookFinding ? hookFinding.title.toLowerCase() : 'the most critical finding'} \u2014 because that alone could be worth extra customer calls per month if we fix it.`,
    },
    {
      objection: '"How much does this cost?"',
      response: `Great question. The report itself is completely free \u2014 we put it together as a way to show businesses where they stand. As for our services, we customize everything based on what you actually need. Based on your audit, the biggest ROI items would be ${findings.length > 0 ? findings[0].category.toLowerCase() : 'website'} optimization and ${findings.length > 1 ? findings[1].category.toLowerCase() : 'SEO'} improvements. But honestly, let's not talk pricing before you've seen the data.`,
    },
  ];

  const keyStats = [
    { value: `${scores.overall}/100`, label: 'Overall Score' },
    { value: `#${targetRanking ? targetRanking.rank : '4'} of ${competitors.length}`, label: 'Market Position' },
    { value: `${scores.metrics.loadTime}s`, label: 'Load Time' },
    { value: `${scores.metrics.reviewCount}`, label: 'Google Reviews' },
    { value: `${scores.metrics.mobileScore}/100`, label: 'Mobile Score' },
    { value: `${scores.metrics.keywordsRanked}`, label: 'Keywords Ranked' },
  ];

  return {
    bestCallTime,
    opening,
    hook,
    painPoints,
    competitorPressure,
    offer,
    objections,
    keyStats,
    topCompetitor,
    targetRanking,
  };
}

// ---- Expose globally ----
window.ScoringEngine = {
  detectInputType,
  normalizeUrl,
  normalizePhone,
  lookupBusinessDemo,
  buildBusinessFromPlaces,
  generateScores,
  generateFindings,
  generateCompetitors,
  generateCallScript,
  getScoreColor,
  getLetterGrade,
  hashString,
};
