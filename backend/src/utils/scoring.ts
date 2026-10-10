export interface UserSeatPreferences {
  seatType?: string;
  window?: boolean;
  powerOutlet?: boolean;
  quietZone?: boolean;
  floorId?: string;
  mostBookedSeatId?: string;
}

export interface CandidateSeat {
  id: string;
  floorId: string;
  label: string;
  seatType: string;
  facing: string;
  attributes: {
    window: boolean;
    powerOutlet: boolean;
    quietZone: boolean;
    nearDoor: boolean;
  };
  groupCapacity?: number;
}

export interface ScoredSeat {
  seat: CandidateSeat;
  score: number;
  reasons: string[];
}

export function scoreSeat(seat: CandidateSeat, prefs: UserSeatPreferences): ScoredSeat {
  let score = 0;
  const reasons: string[] = [];

  // Seat type match: 40 pts
  if (prefs.seatType && seat.seatType === prefs.seatType) {
    score += 40;
    reasons.push(`Matches desired ${seat.seatType.toLowerCase()} seat`);
  } else if (!prefs.seatType) {
    score += 30;
  }

  // Window: 15 pts
  if (seat.attributes.window) {
    if (prefs.window) {
      score += 15;
      reasons.push('Natural light window desk');
    } else {
      score += 5;
    }
  }

  // Power outlet: 15 pts
  if (seat.attributes.powerOutlet) {
    if (prefs.powerOutlet) {
      score += 15;
      reasons.push('Dedicated electrical socket');
    } else {
      score += 5;
    }
  }

  // Quiet zone: 15 pts
  if (seat.attributes.quietZone) {
    if (prefs.quietZone) {
      score += 15;
      reasons.push('Silent research pod');
    } else {
      score += 5;
    }
  }

  // Floor preference: 5 pts
  if (prefs.floorId && seat.floorId === prefs.floorId) {
    score += 5;
    reasons.push('Preferred floor level');
  }

  // Historically most booked seat: +10 pts
  if (prefs.mostBookedSeatId && seat.id === prefs.mostBookedSeatId) {
    score += 10;
    reasons.push('Your favorite frequent desk');
  }

  if (reasons.length === 0) {
    reasons.push('Quiet ergonomic study space');
  }

  return {
    seat,
    score: Math.min(100, Math.max(10, score)),
    reasons,
  };
}

// Haversine formula distance calculation in kilometers
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function scoreLibrary(
  distanceKm: number,
  amenities: { ac: boolean; wifi: boolean; lockers: boolean; powerOutlets: boolean },
  isFree: boolean,
  prefersFree?: boolean
): number {
  let score = 50;

  // Closer libraries score higher
  if (distanceKm < 2) score += 30;
  else if (distanceKm < 5) score += 20;
  else if (distanceKm < 10) score += 10;

  if (amenities.ac) score += 5;
  if (amenities.wifi) score += 5;
  if (amenities.powerOutlets) score += 5;
  if (amenities.lockers) score += 5;

  if (prefersFree && isFree) score += 10;

  return Math.min(100, score);
}
