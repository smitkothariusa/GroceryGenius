import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react';
import { pantryService } from '../../lib/database';
import { isExpiringSoon } from '../../lib/pantryExpiry';
import type { FoodEntry } from '../../data/foodDatabase';

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
  selected: boolean;
  emoji?: string;
}

export type ScanMode = 'menu' | 'camera' | 'barcode' | 'expiry' | 'upload' | 'receipt';
export type CameraSource = 'recipes' | 'pantry';

// Page size for paginated pantry reads (Supabase .range()). Mirrors the copy
// in App.tsx used for shopping — kept generous since per-user item counts
// are low at current scale.
const LIST_PAGE_SIZE = 50;

interface PantryContextValue {
  pantry: PantryItem[];
  setPantry: Dispatch<SetStateAction<PantryItem[]>>;
  pantryHasMore: boolean;
  setPantryHasMore: Dispatch<SetStateAction<boolean>>;
  pantryLoadingMore: boolean;
  setPantryLoadingMore: Dispatch<SetStateAction<boolean>>;
  showAddPantry: boolean;
  setShowAddPantry: Dispatch<SetStateAction<boolean>>;
  newPantryItem: {
    name: string;
    quantity: number | '';
    unit: string;
    category: string;
    expiryDate: string;
    emoji?: string;
  };
  setNewPantryItem: Dispatch<SetStateAction<{
    name: string;
    quantity: number | '';
    unit: string;
    category: string;
    expiryDate: string;
    emoji?: string;
  }>>;
  smartSearchQuery: string;
  setSmartSearchQuery: Dispatch<SetStateAction<string>>;
  smartSearchResults: FoodEntry[];
  setSmartSearchResults: Dispatch<SetStateAction<FoodEntry[]>>;
  selectedFood: FoodEntry | null;
  setSelectedFood: Dispatch<SetStateAction<FoodEntry | null>>;
  smartSearchRef: RefObject<HTMLDivElement>;
  manualQuery: string;
  setManualQuery: Dispatch<SetStateAction<string>>;
  customUnitValue: string;
  setCustomUnitValue: Dispatch<SetStateAction<string>>;
  isCustomUnit: boolean;
  setIsCustomUnit: Dispatch<SetStateAction<boolean>>;
  editCustomUnit: string;
  setEditCustomUnit: Dispatch<SetStateAction<string>>;
  isEditCustomUnit: boolean;
  setIsEditCustomUnit: Dispatch<SetStateAction<boolean>>;
  editingPantryItem: PantryItem | null;
  setEditingPantryItem: Dispatch<SetStateAction<PantryItem | null>>;
  showEditPantry: boolean;
  setShowEditPantry: Dispatch<SetStateAction<boolean>>;
  // Scanning (co-located: scan state lives inside the Pantry UI as a
  // `scanMode` sub-state, and scan handlers write pantry state directly —
  // see features/pantry/ScanModal.tsx).
  scanMode: ScanMode;
  setScanMode: Dispatch<SetStateAction<ScanMode>>;
  barcodeScanning: boolean;
  setBarcodeScanning: Dispatch<SetStateAction<boolean>>;
  expiryScanning: boolean;
  setExpiryScanning: Dispatch<SetStateAction<boolean>>;
  receiptScanning: boolean;
  setReceiptScanning: Dispatch<SetStateAction<boolean>>;
  detectedBarcode: string;
  setDetectedBarcode: Dispatch<SetStateAction<string>>;
  detectedExpiry: string;
  setDetectedExpiry: Dispatch<SetStateAction<string>>;
  receiptItems: ReceiptItem[];
  setReceiptItems: Dispatch<SetStateAction<ReceiptItem[]>>;
  showReceiptReview: boolean;
  setShowReceiptReview: Dispatch<SetStateAction<boolean>>;
  receiptRejectedCount: number;
  setReceiptRejectedCount: Dispatch<SetStateAction<number>>;
  /** Which flow opened the scan modal — 'pantry' routes results into `pantry`, 'recipes' into RecipesContext's `ingredientTags`. */
  cameraSource: CameraSource;
  setCameraSource: Dispatch<SetStateAction<CameraSource>>;
  showImageUpload: boolean;
  setShowImageUpload: Dispatch<SetStateAction<boolean>>;
  /** Items expiring soon (day-0-inclusive boundary — see lib/pantryExpiry.ts). Read by the Donate tab/modal and the expiry banner in App.tsx. */
  getExpiringItems: () => PantryItem[];
  /** Fetch the next page of pantry items and append (de-duping on id so a stale in-flight page can't double-add). */
  loadMorePantry: () => Promise<void>;
}

const PantryContext = createContext<PantryContextValue | null>(null);

/**
 * Owns all Pantry-tab state (the item list/pagination, add/edit forms, the
 * smart-search cluster) and all Scanning state (scanMode sub-state and the
 * camera/barcode/expiry/receipt flows nested inside the Pantry UI) so the
 * Pantry tab, the Recipes tab's "scan ingredients" button (which reuses the
 * same scan modal via `cameraSource`), and the Donate tab/modal (which reads
 * `pantry`/`getExpiringItems`) can all read/write it without prop-drilling.
 * The two are extracted together, not split into separate contexts, because
 * scan handlers write pantry state directly and scan sub-state has always
 * lived inside the Pantry UI (there's no dedicated Scan tab). Cross-cutting
 * handlers that also need `setCurrentTab`, `user`, or RecipesContext's
 * `ingredientTags`/`recipeLoading` stay in the presentational components
 * (PantrySection/ScanModal) and are threaded in as props/hooks — same split
 * as DonationProvider/DonationSection for `handleDonation`.
 */
export function PantryProvider({ children }: { children: ReactNode }) {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [pantryHasMore, setPantryHasMore] = useState(false);
  const [pantryLoadingMore, setPantryLoadingMore] = useState(false);
  const [showAddPantry, setShowAddPantry] = useState(false);
  const [newPantryItem, setNewPantryItem] = useState<{
    name: string;
    quantity: number | '';
    unit: string;
    category: string;
    expiryDate: string;
    emoji?: string;
  }>({
    name: '',
    quantity: 1,
    unit: 'pc',
    category: 'other',
    expiryDate: '',
    emoji: undefined,
  });
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [smartSearchResults, setSmartSearchResults] = useState<FoodEntry[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null);
  const smartSearchRef = useRef<HTMLDivElement>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [customUnitValue, setCustomUnitValue] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [editCustomUnit, setEditCustomUnit] = useState('');
  const [isEditCustomUnit, setIsEditCustomUnit] = useState(false);
  const [editingPantryItem, setEditingPantryItem] = useState<PantryItem | null>(null);
  const [showEditPantry, setShowEditPantry] = useState(false);

  const [scanMode, setScanMode] = useState<ScanMode>('menu');
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [expiryScanning, setExpiryScanning] = useState(false);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [detectedExpiry, setDetectedExpiry] = useState<string>('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [receiptRejectedCount, setReceiptRejectedCount] = useState(0);
  const [cameraSource, setCameraSource] = useState<CameraSource>('recipes');
  const [showImageUpload, setShowImageUpload] = useState(false);

  // Close smart search dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (smartSearchRef.current && !smartSearchRef.current.contains(e.target as Node)) {
        setSmartSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExpiringItems = () => pantry.filter(item => isExpiringSoon(item));

  const loadMorePantry = async () => {
    if (pantryLoadingMore) return;
    setPantryLoadingMore(true);
    try {
      const next = await pantryService.getAll({ limit: LIST_PAGE_SIZE, offset: pantry.length });
      const mapped = next.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date,
        emoji: item.emoji || undefined,
      }));
      setPantry(prev => {
        const seen = new Set(prev.map(i => i.id));
        return [...prev, ...mapped.filter(i => !seen.has(i.id))];
      });
      setPantryHasMore(next.length === LIST_PAGE_SIZE);
    } catch (error) {
      console.error('❌ Error loading more pantry items:', error);
    } finally {
      setPantryLoadingMore(false);
    }
  };

  return (
    <PantryContext.Provider
      value={{
        pantry, setPantry,
        pantryHasMore, setPantryHasMore,
        pantryLoadingMore, setPantryLoadingMore,
        showAddPantry, setShowAddPantry,
        newPantryItem, setNewPantryItem,
        smartSearchQuery, setSmartSearchQuery,
        smartSearchResults, setSmartSearchResults,
        selectedFood, setSelectedFood,
        smartSearchRef,
        manualQuery, setManualQuery,
        customUnitValue, setCustomUnitValue,
        isCustomUnit, setIsCustomUnit,
        editCustomUnit, setEditCustomUnit,
        isEditCustomUnit, setIsEditCustomUnit,
        editingPantryItem, setEditingPantryItem,
        showEditPantry, setShowEditPantry,
        scanMode, setScanMode,
        barcodeScanning, setBarcodeScanning,
        expiryScanning, setExpiryScanning,
        receiptScanning, setReceiptScanning,
        detectedBarcode, setDetectedBarcode,
        detectedExpiry, setDetectedExpiry,
        receiptItems, setReceiptItems,
        showReceiptReview, setShowReceiptReview,
        receiptRejectedCount, setReceiptRejectedCount,
        cameraSource, setCameraSource,
        showImageUpload, setShowImageUpload,
        getExpiringItems,
        loadMorePantry,
      }}
    >
      {children}
    </PantryContext.Provider>
  );
}

export function usePantry(): PantryContextValue {
  const ctx = useContext(PantryContext);
  if (!ctx) {
    throw new Error('usePantry must be used within a PantryProvider');
  }
  return ctx;
}
