export interface FoodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  acceptedItems: string[];
  hours: string;
  distance?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DonationRecord {
  id: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    estimatedMeals: number;
  }>;
  foodBank: string;
  totalMeals: number;
}

export interface DonationImpact {
  totalDonations: number;
  totalMeals: number;
  totalPounds: number;
  co2Saved: number;
  lastDonation?: string;
}