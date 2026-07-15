import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { FoodBank, DonationRecord, DonationImpact } from '../../types/donation';
import { foodBanks } from '../../data/foodBanks';
import { safeStorage } from '../../lib/safeStorage';

export interface DropOffSite {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
  lat: number;
  lng: number;
}

export const dropOffSites: DropOffSite[] = [
  // Chesapeake
  { id: 'do1', name: 'Ashley Furniture Homestore', address: '1591 Crossways Blvd.', city: 'Chesapeake', hours: 'Daily from 11 am to 7 pm', lat: 36.7682, lng: -76.2875 },
  { id: 'do2', name: 'Chesapeake Farm Bureau', address: '552 S. Battlefield Blvd.', city: 'Chesapeake', hours: 'Monday through Friday from 8 am to 4:30 pm', lat: 36.7477, lng: -76.2394 },
  { id: 'do3', name: 'Chesapeake Police HQ', address: '304 Albemarle Dr.', city: 'Chesapeake', hours: 'Daily from 8 am to 8 pm', lat: 36.7682, lng: -76.2875 },
  { id: 'do4', name: 'Cinema Café – Edinburgh', address: '1864 Edinburgh Ln.', city: 'Chesapeake', hours: 'Daily from 12 to 10 pm', lat: 36.7500, lng: -76.2400 },
  { id: 'do5', name: 'Cinema Café – Greenbrier Mall', address: '1401 Greenbrier Pkwy.', city: 'Chesapeake', hours: 'Daily from 12 to 10 pm', lat: 36.7719, lng: -76.2278 },
  { id: 'do6', name: 'Fulton Bank', address: '217 E Hanbury Rd.', city: 'Chesapeake', hours: 'Monday through Friday from 9 am to 5 pm, Saturday from 9 am to 12 pm', lat: 36.7600, lng: -76.2500 },
  // Norfolk
  { id: 'do7', name: 'Afterglow Brewing', address: '2330 Bowdens Ferry Rd., Ste. 600', city: 'Norfolk', hours: 'Monday through Thursday from 3 to 9 pm, Friday through Sunday from 12 to 8 pm', lat: 36.9037, lng: -76.2050 },
  { id: 'do8', name: 'Elation Brewing', address: '5104 Colley Ave.', city: 'Norfolk', hours: 'Daily from 12 to 9 pm', lat: 36.8879, lng: -76.3050 },
  // Virginia Beach
  { id: 'do9', name: 'Ashley Furniture Homestore', address: '5144 Virginia Beach Blvd.', city: 'Virginia Beach', hours: 'Daily from 11 am to 7 pm', lat: 36.8432, lng: -76.1395 },
  { id: 'do10', name: 'Cinema Café – Kemps River', address: '1220 Fordham Dr.', city: 'Virginia Beach', hours: 'Daily from 12 to 10 pm', lat: 36.7800, lng: -76.1100 },
  { id: 'do11', name: 'Cinema Café – Pembroke Meadows', address: '752 Independence Blvd. Ste. 4590', city: 'Virginia Beach', hours: 'Daily from 12 to 10 pm', lat: 36.8400, lng: -76.1200 },
  { id: 'do12', name: 'DAV Thrift Store', address: '1525 General Booth Blvd.', city: 'Virginia Beach', hours: 'Monday through Saturday from 9 am to 8 pm, Sunday from 12 to 5 pm', lat: 36.8100, lng: -76.0500 },
  { id: 'do13', name: 'Fulton Bank', address: '4424 Bonney Rd.', city: 'Virginia Beach', hours: 'Monday through Friday from 9 am to 5 pm', lat: 36.8500, lng: -76.1300 },
  { id: 'do14', name: 'Fulton Bank', address: '3345 Dam Neck Rd.', city: 'Virginia Beach', hours: 'Monday through Friday from 9 am to 5 pm, Saturday from 9 am to 12 pm', lat: 36.8200, lng: -76.0200 },
  { id: 'do15', name: 'PenFed Credit Union', address: '4920 Haygood Rd.', city: 'Virginia Beach', hours: 'Monday through Friday from 9 am to 5 pm', lat: 36.8350, lng: -76.1150 }
];

/** Great-circle distance in miles between two lat/lng points (haversine). */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface DonationContextValue {
  donationImpact: DonationImpact;
  setDonationImpact: Dispatch<SetStateAction<DonationImpact>>;
  donationHistory: DonationRecord[];
  setDonationHistory: Dispatch<SetStateAction<DonationRecord[]>>;
  showDonationModal: boolean;
  setShowDonationModal: Dispatch<SetStateAction<boolean>>;
  selectedFoodBank: FoodBank | null;
  setSelectedFoodBank: Dispatch<SetStateAction<FoodBank | null>>;
  itemsToDonate: string[];
  setItemsToDonate: Dispatch<SetStateAction<string[]>>;
  selectedDropOffSite: DropOffSite | null;
  setSelectedDropOffSite: Dispatch<SetStateAction<DropOffSite | null>>;
  showShareModal: boolean;
  setShowShareModal: Dispatch<SetStateAction<boolean>>;
  donateSubTab: 'foodbanks' | 'dropoffs';
  setDonateSubTab: Dispatch<SetStateAction<'foodbanks' | 'dropoffs'>>;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>;
  locationPermission: 'granted' | 'denied' | 'pending';
  setLocationPermission: Dispatch<SetStateAction<'granted' | 'denied' | 'pending'>>;
  allItemsImpact: { [itemId: string]: { meals: number; pounds: number; co2_lbs: number } };
  setAllItemsImpact: Dispatch<SetStateAction<{ [itemId: string]: { meals: number; pounds: number; co2_lbs: number } }>>;
  loadingImpact: boolean;
  setLoadingImpact: Dispatch<SetStateAction<boolean>>;
  /** Food banks sorted by distance from `userLocation` (unsorted if location unknown). */
  getSortedFoodBanks: () => FoodBank[];
  /** Drop-off sites sorted by distance from `userLocation` (unsorted if location unknown). */
  getSortedDropOffSites: () => DropOffSite[];
  /** Share-card copy built from the current `donationImpact` totals. */
  generateShareText: () => string;
}

const DonationContext = createContext<DonationContextValue | null>(null);

/**
 * Owns all Donation-tab state (impact totals, history, the record-donation
 * and share modals, food-bank/drop-off selection, and the user's opted-in
 * location) so both the Donation tab and the Pantry tab's "Donate" button
 * (which opens the same modal) can read/write it without prop-drilling
 * through App.tsx. Cross-cutting logic that also needs pantry items, the
 * pantry setter, or the tab switcher (loading donation history/impact on
 * sign-in, submitting a donation, calculating per-item impact) stays in
 * App.tsx and is threaded into the presentational components as props —
 * same split as FavoritesProvider/FavoritesSection.
 */
export function DonationProvider({ children }: { children: ReactNode }) {
  const [donationImpact, setDonationImpact] = useState<DonationImpact>({
    totalDonations: 0,
    totalMeals: 0,
    totalPounds: 0,
    co2Saved: 0
  });
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedFoodBank, setSelectedFoodBank] = useState<FoodBank | null>(null);
  const [itemsToDonate, setItemsToDonate] = useState<string[]>([]);
  const [selectedDropOffSite, setSelectedDropOffSite] = useState<DropOffSite | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [donateSubTab, setDonateSubTab] = useState<'foodbanks' | 'dropoffs'>('foodbanks');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [allItemsImpact, setAllItemsImpact] = useState<{
    [itemId: string]: { meals: number; pounds: number; co2_lbs: number };
  }>({});
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocationPermission = safeStorage.getItem('locationPermission');
    const savedUserLocation = safeStorage.getItem('userLocation');

    if (savedLocationPermission === 'granted' && savedUserLocation) {
      try {
        const location = JSON.parse(savedUserLocation);
        setUserLocation(location);
        setLocationPermission('granted');
        console.log('✅ Restored location from localStorage:', location);
      } catch (err) {
        console.error('Error parsing saved location:', err);
      }
    } else if (savedLocationPermission === 'denied') {
      setLocationPermission('denied');
    }
  }, []);

  const getSortedFoodBanks = (): FoodBank[] => {
    if (!userLocation) return foodBanks;

    return [...foodBanks].sort((a, b) => {
      // Check if coordinates exist
      if (!a.coordinates || !b.coordinates) return 0;

      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.coordinates.lat, a.coordinates.lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.coordinates.lat, b.coordinates.lng);
      return distA - distB;
    });
  };

  const getSortedDropOffSites = (): DropOffSite[] => {
    if (!userLocation) return dropOffSites;
    return [...dropOffSites].sort((a, b) => {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    });
  };

  const generateShareText = () => {
    const treesEquivalent = Math.round(donationImpact.co2Saved / 48);
    const gasSaved = Math.round(donationImpact.co2Saved / 19.6);

    return `I've donated ${donationImpact.totalMeals} meals and saved ${Math.round(donationImpact.totalPounds)} lbs of food using GroceryGenius! 🎉

That's equivalent to planting ${treesEquivalent} trees 🌳 and saving ${gasSaved} gallons of gas! ⛽

Together we can fight hunger and reduce food waste. Join me in making an impact! 💚

#FoodDonation #EndHunger #SustainableLiving #GroceryGenius`;
  };

  return (
    <DonationContext.Provider
      value={{
        donationImpact, setDonationImpact,
        donationHistory, setDonationHistory,
        showDonationModal, setShowDonationModal,
        selectedFoodBank, setSelectedFoodBank,
        itemsToDonate, setItemsToDonate,
        selectedDropOffSite, setSelectedDropOffSite,
        showShareModal, setShowShareModal,
        donateSubTab, setDonateSubTab,
        userLocation, setUserLocation,
        locationPermission, setLocationPermission,
        allItemsImpact, setAllItemsImpact,
        loadingImpact, setLoadingImpact,
        getSortedFoodBanks,
        getSortedDropOffSites,
        generateShareText,
      }}
    >
      {children}
    </DonationContext.Provider>
  );
}

export function useDonation(): DonationContextValue {
  const ctx = useContext(DonationContext);
  if (!ctx) {
    throw new Error('useDonation must be used within a DonationProvider');
  }
  return ctx;
}
