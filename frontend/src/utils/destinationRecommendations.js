/**
 * Curated Sri Lanka Destination Activities Catalog
 * Filtered by destination, weather condition, and traveller onboarding interests.
 */

export const CURATED_ACTIVITIES = [
  // Ella
  {
    name: "Nine Arches Bridge Scenic Rail Walk",
    destination: "Ella",
    category: "Photography & Landmarks",
    description: "Witness the iconic colonial viaduct nestled in high tea country as highland express trains pass.",
    location: "Demodara, Ella",
    estimatedCost: 0,
    durationMinutes: 90,
    matchedInterests: ["Photography", "Nature", "Historical Places"],
    weatherSuitability: ["Sunny", "Cloudy", "Clear"],
  },
  {
    name: "Little Adam's Peak Ridge Ascent",
    destination: "Ella",
    category: "Hiking & Trekking",
    description: "Moderate scenic panoramic trail through tea estates leading to 360-degree views of Ella Rock and Southern plains.",
    location: "Passara Road, Ella",
    estimatedCost: 500,
    durationMinutes: 120,
    matchedInterests: ["Hiking", "Adventure", "Nature", "Photography"],
    weatherSuitability: ["Sunny", "Clear", "Cloudy"],
  },
  {
    name: "Ravana Falls & Cave Exploration",
    destination: "Ella",
    category: "Nature & Waterfalls",
    description: "One of the widest waterfalls in Sri Lanka, connected to the legendary Ramayana epic trail.",
    location: "Wellawaya Road, Ella",
    estimatedCost: 300,
    durationMinutes: 60,
    matchedInterests: ["Nature", "Culture & History", "Adventure"],
    weatherSuitability: ["Sunny", "Clear"],
  },
  {
    name: "Halpewatte Organic Tea Factory & Tasting Tour",
    destination: "Ella",
    category: "Cultural & Culinary",
    description: "Guided tour through vintage British tea machinery, orthodox production stages, and artisanal Ceylon tea sampling.",
    location: "Badulla Road, Ella",
    estimatedCost: 1500,
    durationMinutes: 75,
    matchedInterests: ["Food & Culinary", "Culture & History", "Family"],
    weatherSuitability: ["Sunny", "Rain", "Cloudy"], // Indoor-friendly!
  },

  // Kandy
  {
    name: "Temple of the Sacred Tooth Relic (Sri Dalada Maligawa)",
    destination: "Kandy",
    category: "Culture & Heritage",
    description: "World UNESCO Heritage temple housing Sri Lanka's most venerated Buddhist relic.",
    location: "Kandy Lakefront",
    estimatedCost: 2000,
    durationMinutes: 120,
    matchedInterests: ["Culture & History", "Historical Places", "Museums"],
    weatherSuitability: ["Sunny", "Rain", "Cloudy"],
  },
  {
    name: "Royal Botanical Gardens, Peradeniya",
    destination: "Kandy",
    category: "Nature & Flora",
    description: "147-acre historic royal flora park featuring an orchid collection of over 4,000 species and palm avenues.",
    location: "Peradeniya, Kandy",
    estimatedCost: 3000,
    durationMinutes: 150,
    matchedInterests: ["Nature", "Photography", "Family", "Relaxation"],
    weatherSuitability: ["Sunny", "Clear", "Cloudy"],
  },
  {
    name: "Udawatta Kele Sanctuary Birdwatching Trail",
    destination: "Kandy",
    category: "Hiking & Wildlife",
    description: "Historic forest reserve teeming with endemic bird species, giant lianas, and royal hermitages.",
    location: "Kandy Hills",
    estimatedCost: 1200,
    durationMinutes: 120,
    matchedInterests: ["Nature", "Hiking", "Adventure"],
    weatherSuitability: ["Sunny", "Clear"],
  },

  // Galle
  {
    name: "Galle Dutch Fort Ramparts Sunset Walk",
    destination: "Galle",
    category: "Historical Architecture",
    description: "17th-century fortified bastion facing the Indian Ocean, preserved with Portuguese and Dutch colonial architecture.",
    location: "Galle Fort",
    estimatedCost: 0,
    durationMinutes: 100,
    matchedInterests: ["Culture & History", "Photography", "Relaxation", "Historical Places"],
    weatherSuitability: ["Sunny", "Clear", "Cloudy"],
  },
  {
    name: "National Maritime Archaeology Museum",
    destination: "Galle",
    category: "Museums & History",
    description: "Exhibiting artifacts recovered from Dutch VOC shipwrecks and traditional southern seafaring history.",
    location: "Old Dutch Warehouse, Galle",
    estimatedCost: 1000,
    durationMinutes: 60,
    matchedInterests: ["Museums", "Culture & History"],
    weatherSuitability: ["Sunny", "Rain", "Cloudy"],
  },
  {
    name: "Unawatuna Coral Reef & Snorkeling",
    destination: "Galle",
    category: "Water Sports & Marine",
    description: "Guided boat trip to shallow coral gardens with tropical reef fish and sea turtle sightings.",
    location: "Unawatuna Bay, Galle",
    estimatedCost: 4500,
    durationMinutes: 120,
    matchedInterests: ["Adventure", "Nature", "Relaxation"],
    weatherSuitability: ["Sunny", "Clear"],
  },

  // Sigiriya & Dambulla
  {
    name: "Sigiriya Lion Rock Citadel Ascent",
    destination: "Sigiriya",
    category: "Ancient Architecture & Hiking",
    description: "5th-century palace fortress towering 200 meters above the central plains, featuring world-famous fresco paintings.",
    location: "Sigiriya Heritage Reserve",
    estimatedCost: 10800,
    durationMinutes: 180,
    matchedInterests: ["Historical Places", "Hiking", "Photography", "Culture & History"],
    weatherSuitability: ["Sunny", "Clear"],
  },
  {
    name: "Pidurangala Rock Sunrise Climb",
    destination: "Sigiriya",
    category: "Adventure & Hiking",
    description: "Panoramic boulder climb offering the most celebrated direct view of Sigiriya Lion Rock at dawn.",
    location: "Pidurangala, Sigiriya",
    estimatedCost: 1000,
    durationMinutes: 120,
    matchedInterests: ["Adventure", "Hiking", "Photography"],
    weatherSuitability: ["Sunny", "Clear"],
  },
  {
    name: "Dambulla Royal Cave Temple",
    destination: "Dambulla",
    category: "Culture & Heritage",
    description: "Vast cave monastery complex with five sanctuaries containing ancient Buddhist murals and 153 statues.",
    location: "Dambulla Rock",
    estimatedCost: 2000,
    durationMinutes: 90,
    matchedInterests: ["Culture & History", "Historical Places", "Museums"],
    weatherSuitability: ["Sunny", "Rain", "Cloudy"],
  },

  // Nuwara Eliya
  {
    name: "Horton Plains & World's End Escarpment Trail",
    destination: "Nuwara Eliya",
    category: "Highland Trekking & Nature",
    description: "Protected cloud forest plateau dropping 870 meters into the southern abyss at World's End cliff.",
    location: "Ohiya, Nuwara Eliya",
    estimatedCost: 9500,
    durationMinutes: 240,
    matchedInterests: ["Hiking", "Nature", "Photography", "Adventure"],
    weatherSuitability: ["Sunny", "Clear"],
  },
  {
    name: "Gregory Lake Promenade & Watercraft",
    destination: "Nuwara Eliya",
    category: "Family & Relaxation",
    description: "Colonial-era mountain reservoir with pedal boating, pony rides, and temperate lakeside gardens.",
    location: "Badulla Road, Nuwara Eliya",
    estimatedCost: 1000,
    durationMinutes: 75,
    matchedInterests: ["Family", "Relaxation", "Nature"],
    weatherSuitability: ["Sunny", "Cloudy", "Clear"],
  },

  // Colombo
  {
    name: "Galle Face Green Heritage Promenade & Street Food",
    destination: "Colombo",
    category: "Culinary & Oceanfront",
    description: "Vibrant oceanfront urban park famous for sunset views, kite flying, and authentic isso vadai street cuisine.",
    location: "Kollupitiya, Colombo",
    estimatedCost: 800,
    durationMinutes: 90,
    matchedInterests: ["Food & Culinary", "Relaxation", "Family", "Local Experiences"],
    weatherSuitability: ["Sunny", "Clear", "Cloudy"],
  },
  {
    name: "Colombo National Museum & Art Gallery",
    destination: "Colombo",
    category: "Museums & History",
    description: "Sri Lanka's premier museum containing the royal regalia and throne of the last King of Kandy.",
    location: "Cinnamon Gardens, Colombo 07",
    estimatedCost: 1200,
    durationMinutes: 120,
    matchedInterests: ["Museums", "Culture & History", "Historical Places"],
    weatherSuitability: ["Sunny", "Rain", "Cloudy"],
  },
];

export function getRecommendedActivities(destination, userInterests = [], weatherCondition = "") {
  const destLower = (destination || "").toLowerCase().trim();
  const isRainy = (weatherCondition || "").toLowerCase().includes("rain") || (weatherCondition || "").toLowerCase().includes("drizzle");

  return CURATED_ACTIVITIES.filter((act) => {
    // Match destination or include if general
    const matchesDest = act.destination.toLowerCase() === destLower || destLower.includes(act.destination.toLowerCase());
    if (!matchesDest && destination) return false;

    // Filter out purely outdoor hiking if rain
    if (isRainy && !act.weatherSuitability.includes("Rain") && act.category.includes("Hiking")) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Rank by number of matched user interests
    const userList = Array.isArray(userInterests) ? userInterests : [];
    const aMatches = a.matchedInterests.filter((i) => userList.includes(i)).length;
    const bMatches = b.matchedInterests.filter((i) => userList.includes(i)).length;
    return bMatches - aMatches;
  });
}
