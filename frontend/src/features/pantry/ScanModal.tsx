import { useTranslation } from 'react-i18next';
import { authFetch } from '../../lib/apiClient';
import { pantryService } from '../../lib/database';
import { searchFoods } from '../../data/foodDatabase';
import { useRecipes } from '../recipes/RecipesContext';
import { usePantry, type PantryItem } from './PantryContext';

const API_BASE = import.meta.env.VITE_API_URL || '/_/backend';

interface ScanModalProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
  /** Read-only — owned by App.tsx's auth state; the barcode scanner only persists to the database when a user is signed in. */
  user: any;
  /** Scan results route to the Pantry tab or the Recipes tab depending on `cameraSource` (set by whichever entry point opened the modal). */
  onNavigateToTab: (tab: 'pantry' | 'recipes') => void;
  onSuccess: (message: string) => void;
  onWarning: (message: string) => void;
  onError: (message: string) => void;
}

/**
 * The shared camera/barcode/expiry/receipt scan modal, nested inside the
 * Pantry UI (there's no dedicated Scan tab). Reused by the Recipes tab's
 * "scan ingredients" button via `cameraSource` — see PantryContext's doc
 * comment for why this is co-located with Pantry rather than split out.
 */
export function ScanModal({
  isMobile,
  cardBg,
  mutedText,
  user,
  onNavigateToTab,
  onSuccess,
  onWarning,
  onError,
}: ScanModalProps) {
  const { t, i18n } = useTranslation();
  const {
    setPantry,
    scanMode, setScanMode,
    setBarcodeScanning,
    setExpiryScanning,
    setReceiptScanning,
    setDetectedExpiry,
    receiptItems, setReceiptItems,
    showReceiptReview, setShowReceiptReview,
    receiptRejectedCount, setReceiptRejectedCount,
    cameraSource,
    showImageUpload, setShowImageUpload,
    setNewPantryItem,
    setShowAddPantry,
  } = usePantry();
  const {
    recipeLoading, setRecipeLoading,
    ingredientTags, setIngredientTags,
  } = useRecipes();

  // Persist scanned items to the database so they survive navigation and can
  // be edited later (local-only Date.now() ids break pantryService.update).
  const addScannedItemsToPantry = async (names: string[]) => {
    try {
      const savedItems = await Promise.all(names.map(name =>
        pantryService.add({ name, quantity: 1, unit: 'pc', category: 'other' })
      ));
      setPantry(prev => [...prev, ...savedItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date || undefined,
        emoji: item.emoji || undefined,
      }))]);
      onSuccess(t('toasts.addedItemsToPantry', { count: names.length }));
    } catch (err) {
      // Keep the scan results visible locally so they aren't lost outright,
      // but tell the user the save failed.
      setPantry(prev => [...prev, ...names.map(name => ({
        id: `${Date.now()}-${Math.random()}`,
        name,
        quantity: 1,
        unit: 'pc',
        category: 'other',
      }))]);
      onWarning(t('toasts.failedAddItem'));
    }
  };
  const handleCameraCapture = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      // Create a video element to show camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Create modal to show camera
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;';
      
      video.style.cssText = 'max-width:90%;max-height:70vh;border-radius:12px;';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;gap:1rem;margin-top:2rem;';
      
      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Capture';
      captureBtn.style.cssText = 'padding:1rem 2rem;background:#10b981;color:white;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕ Cancel';
      cancelBtn.style.cssText = 'padding:1rem 2rem;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;';
      
      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        setShowImageUpload(false);
        setScanMode('menu');
      };

      captureBtn.onclick = () => {
        // Create canvas to capture image
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            cleanup();
            setShowImageUpload(false);
            setRecipeLoading(true);

            try {
              const formData = new FormData();
              formData.append('file', blob, 'camera-capture.jpg');

              const response = await authFetch(`${API_BASE}/vision/analyze-ingredients`, {
                method: 'POST',
                body: formData
              });

              if (!response.ok) throw new Error(`API error: ${response.status}`);

              const data = await response.json();

              if (data.success && data.ingredients.length > 0) {
                if (cameraSource === 'pantry') {
                  // Add to pantry (persisted to the database)
                  await addScannedItemsToPantry(data.ingredients);

                  // Switch to pantry tab
                  onNavigateToTab('pantry');
                } else {
                  // Add to recipe ingredients
                  const newIngredients = data.ingredients.filter(
                    (ing: string) => !ingredientTags.includes(ing.toLowerCase())
                  );

                  setIngredientTags(prev => [...prev, ...newIngredients]);
                  onSuccess(t('toasts.foundIngredients', { count: data.ingredients.length }));

                  // Switch to recipes tab
                  onNavigateToTab('recipes');
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                onWarning(t('toasts.noItemsDetected'));
              }
            } catch (err) {
              console.error('Image analysis error:', err);
              onError(t('toasts.failedAnalyzeImage'));
            } finally {
              setRecipeLoading(false);
            }
          }
        }, 'image/jpeg', 0.95);
      };

      cancelBtn.onclick = cleanup;

      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(video);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

    } catch (err) {
      console.error('Camera access error:', err);
      onError(t('toasts.cameraAccessDenied'));
    }
  };
  const lookupBarcodeWithImage = async (imageData: string) => {
    try {
      console.log('🔍 Looking up product using vision AI...');
      
      // Vision AI (FIRST - Most accurate with actual product image)
      try {
        console.log('👁️ Using GPT-4 Vision to identify product...');
        const visionResponse = await authFetch(`${API_BASE}/barcode/vision-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData })
        });
        
        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          console.log('Vision API response:', visionData);
          
          // List of example/placeholder products to reject
          const placeholders = [
            'coca-cola classic',
            'kraft macaroni',
            'kraft singles',
            'american cheese slices',
            'horizon organic',
            "lay's classic",
            'parle g biscuit',
            'parle-g biscuit',
            'parle g gold',
            'unknown product',
            'example product',
            'sample product'
          ];
          
          const productNameLower = (visionData.name || '').toLowerCase();
          const isPlaceholder = placeholders.some(p => productNameLower.includes(p));
          const hasValidBarcode = visionData.barcode && visionData.barcode !== 'unreadable' && visionData.barcode.length >= 8;
          
          // Check if this is a suspiciously generic response
          const isGeneric = productNameLower === 'pasta' || productNameLower === 'sauce' || 
                           productNameLower === 'cheese' || productNameLower === 'tomatoes';
          
          if (visionData.name && visionData.name.trim() && !isPlaceholder && !isGeneric && hasValidBarcode) {
            console.log('✅ Found from Vision AI:', visionData.name);
            console.log('📊 Barcode read:', visionData.barcode);
            const confidenceEmoji = visionData.confidence === 'high' ? '💯' : visionData.confidence === 'medium' ? '✅' : '⚠️';
            onSuccess(t('toasts.productIdentified', { emoji: confidenceEmoji, name: visionData.name }));
            return {
              name: visionData.name.trim(),
              category: visionData.category || 'other',
              expiryDays: null
            };
          } else if (isPlaceholder) {
            console.log('⚠️ Vision API returned placeholder/example, rejecting...');
          } else if (!hasValidBarcode) {
            console.log('⚠️ Vision API could not read barcode clearly');
          }
        }
      } catch (err) {
        console.log('❌ Vision AI failed:', err);
      }
      
      // If vision fails, return null to trigger fallback
      return null;
      
    } catch (error) {
      console.error('💥 Vision lookup error:', error);
      return null;
    }
  };

  const lookupBarcode = async (barcode: string) => {
    try {
      console.log('🔍 Looking up barcode:', barcode);
      
      // Method 1: OpenFoodFacts — authoritative product database keyed by the
      // exact barcode. Tried FIRST because it's fast (~200ms) and accurate,
      // unlike the AI guesses which now run only as fallbacks. Reordered
      // 2026-07-18 after user reports of slow scans + wrong identifications
      // (the GPT vision/number calls used to run first).
      try {
        console.log('📡 Trying OpenFoodFacts as backup...');
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        
        if (offResponse.ok) {
          const offData = await offResponse.json();
          console.log('OpenFoodFacts response:', offData);
          
          if (offData.status === 1 && offData.product) {
            const product = offData.product;
            const productName = 
              product.product_name || 
              product.product_name_en ||
              product.generic_name || 
              (product.brands && product.product_name ? `${product.brands} ${product.product_name}` : null) ||
              product.brands ||
              null;
            
            if (productName && productName.trim()) {
              console.log('✅ Found from OpenFoodFacts:', productName);
              
              // Try to determine category from OpenFoodFacts categories
              let category = 'other';
              if (product.categories_tags) {
                const cats = product.categories_tags;
                if (cats.some((c: string) => c.includes('meat') || c.includes('poultry') || c.includes('beef') || c.includes('chicken'))) {
                  category = 'meat';
                } else if (cats.some((c: string) => c.includes('dairy') || c.includes('milk') || c.includes('cheese') || c.includes('yogurt'))) {
                  category = 'dairy';
                } else if (cats.some((c: string) => c.includes('fruit') || c.includes('vegetable') || c.includes('produce'))) {
                  category = 'produce';
                } else if (cats.some((c: string) => c.includes('cereal') || c.includes('grain') || c.includes('bread') || c.includes('pasta'))) {
                  category = 'grains';
                } else if (cats.some((c: string) => c.includes('canned') || c.includes('preserved'))) {
                  category = 'canned';
                } else if (cats.some((c: string) => c.includes('breakfast'))) {
                  category = 'breakfast';
                }
              }
              
              return {
                name: productName.trim(),
                category: category,
                expiryDays: null
              };
            }
          }
        }
      } catch (err) {
        console.log('❌ OpenFoodFacts failed:', err);
      }
      
      // Method 3: UPCitemdb (Backup - Good for general products - FREE trial - 100 per day)
      try {
        console.log('📡 Trying UPCitemdb as backup...');
        const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
        
        if (upcResponse.ok) {
          const upcData = await upcResponse.json();
          console.log('UPCitemdb response:', upcData);
          
          if (upcData.items && upcData.items.length > 0) {
            const item = upcData.items[0];
            const itemName = item.title || item.brand || null;
            
            if (itemName && itemName.trim()) {
              console.log('✅ Found from UPCitemdb:', itemName);

              // Map category
              let category = 'other';
              const cat = (item.category || '').toLowerCase();
              if (cat.includes('food') || cat.includes('grocery')) category = 'other';
              if (cat.includes('produce') || cat.includes('fruit') || cat.includes('vegetable')) category = 'produce';
              if (cat.includes('dairy') || cat.includes('milk') || cat.includes('cheese')) category = 'dairy';
              if (cat.includes('meat') || cat.includes('poultry')) category = 'meat';
              if (cat.includes('canned') || cat.includes('packaged')) category = 'canned';
              if (cat.includes('cereal') || cat.includes('grain') || cat.includes('bread')) category = 'grains';
              if (cat.includes('breakfast')) category = 'breakfast';
              
              return {
                name: itemName.trim(),
                category: category,
                expiryDays: null
              };
            }
          }
        }
      } catch (err) {
        console.log('❌ UPCitemdb failed:', err);
      }
      
      // Method 4: Barcode Spider (Last backup - with your API token)
      try {
        console.log('📡 Trying Barcode Spider as last backup...');
        const spiderResponse = await fetch(`https://api.barcodespider.com/v1/lookup?token=03abb14d5d130e66277e&upc=${barcode}`);
        
        if (spiderResponse.ok) {
          const spiderData = await spiderResponse.json();
          console.log('Barcode Spider response:', spiderData);
          
          if (spiderData && spiderData.item_response && spiderData.item_response.code === 200) {
            const item = spiderData.item_response.item;
            if (item && item.title && item.title.trim()) {
              console.log('✅ Found from Barcode Spider:', item.title);
              return {
                name: item.title.trim(),
                category: item.category || 'other',
                expiryDays: null
              };
            }
          }
        }
      } catch (err) {
        console.log('❌ Barcode Spider failed:', err);
      }

      // Method 5 (last resort): OpenAI guess from the barcode NUMBER. Least
      // reliable — no product image, just the digits — so it runs only after
      // every authoritative database has missed. (Previously this was tried
      // FIRST, which was a major source of wrong identifications.)
      try {
        console.log('🤖 Trying OpenAI number lookup as last resort...');
        const aiResponse = await authFetch(`${API_BASE}/barcode/ai-lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode })
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.name && aiData.name.trim() && !aiData.name.includes('Unknown Product')) {
            console.log('✅ Found from OpenAI:', aiData.name);
            onSuccess(t('toasts.productIdentifiedAI'));
            return {
              name: aiData.name.trim(),
              category: aiData.category || 'other',
              expiryDays: null
            };
          }
        }
      } catch (err) {
        console.log('❌ OpenAI number lookup failed:', err);
      }

      // Nothing matched any database or the number guess. Return null so the
      // caller can try image vision as a further fallback before giving up.
      console.log('⚠️ Product not found in any database');
      return null;

    } catch (error) {
      console.error('💥 Barcode lookup error:', error);
      return null;
    }
  };
  const handleBarcodeScanner = async () => {
    try {
      setBarcodeScanning(true);
      
      // Import Quagga dynamically
      const Quagga = await import('quagga');
      
      // Track if we've already processed a barcode
      let isProcessing = false;
      let lastScannedCode = '';
      
      // Create scanner container
      const scannerDiv = document.createElement('div');
      scannerDiv.id = 'barcode-scanner';
      scannerDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
      
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = 'width:90%;max-width:640px;height:480px;position:relative;';
      
      const instructions = document.createElement('div');
      instructions.style.cssText = 'color:white;text-align:center;margin-bottom:1rem;font-size:1.1rem;font-weight:600;';
      instructions.textContent = '📱 Position barcode in the frame';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'margin-top:1rem;padding:0.75rem 2rem;background:#ef4444;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;position:relative;z-index:10;';
      
      // Attach cancel handler BEFORE adding to DOM
      cancelBtn.onclick = () => {
        try {
          Quagga.stop();
          Quagga.offDetected(() => {});
        } catch (e) {
          console.error('Error stopping Quagga:', e);
        }
        if (document.body.contains(scannerDiv)) {
          document.body.removeChild(scannerDiv);
        }
        setBarcodeScanning(false);
        setShowImageUpload(false);
        setScanMode('menu');
      };
      
      scannerDiv.appendChild(instructions);
      scannerDiv.appendChild(videoContainer);
      scannerDiv.appendChild(cancelBtn);
      document.body.appendChild(scannerDiv);
      
      // Initialize Quagga
      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: videoContainer,
          constraints: {
            facingMode: 'environment',
            width: 640,
            height: 480
          }
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader'
          ]
        },
        locate: true
      }, (err: any) => {
        if (err) {
          console.error('Quagga initialization error:', err);
          onError(t('toasts.failedStartBarcode'));
          if (document.body.contains(scannerDiv)) {
            document.body.removeChild(scannerDiv);
          }
          setBarcodeScanning(false);
          setShowImageUpload(false);
          setScanMode('menu');
          return;
        }
        Quagga.start();
      });
      
      // Track consecutive high-quality scans for the same barcode
      let consecutiveScans = 0;
      let currentBestQuality = 1.0;
      
      // Handle barcode detection with validation and image capture
      Quagga.onDetected(async (result: any) => {
        const code = result.codeResult.code;
        
        // Validate barcode completeness and quality
        // Standard UPC/EAN barcodes are 8, 12, 13, or 14 digits
        const isValidLength = code.length === 8 || code.length === 12 || code.length === 13 || code.length === 14;
        const isNumeric = /^\d+$/.test(code);
        
        // Check quality of the scan (Quagga provides this)
        const quality = result.codeResult.decodedCodes
          .filter((x: any) => x.error !== undefined)
          .map((x: any) => x.error)
          .reduce((a: number, b: number) => a + b, 0) / result.codeResult.decodedCodes.length;
        
        // STRICT quality threshold - only accept very clear reads
        if (!isValidLength || !isNumeric || quality > 0.08) {
          console.log('❌ Invalid or low-quality barcode scan:', { code, isValidLength, isNumeric, quality: quality.toFixed(3) });
          // Update instructions to help user
          instructions.textContent = '📱 Hold steady - Getting clearer read...';
          instructions.style.color = '#fbbf24'; // Yellow warning
          
          // Reset consecutive scan counter
          consecutiveScans = 0;
          currentBestQuality = 1.0;
          return;
        }
        
        // Track if we're getting the same barcode repeatedly (stability check)
        if (code === lastScannedCode) {
          consecutiveScans++;
          currentBestQuality = Math.min(currentBestQuality, quality);
          
          // Update UI to show progress
          instructions.textContent = `📊 Stabilizing... (${consecutiveScans}/3 reads)`;
          instructions.style.color = '#3b82f6'; // Blue - in progress
          
          // Wait for 3 consecutive high-quality reads of the same barcode
          if (consecutiveScans < 3) {
            console.log(`📊 Consecutive scan ${consecutiveScans}/3, quality: ${quality.toFixed(3)}`);
            return;
          }
        } else {
          // Different barcode detected, reset counter
          consecutiveScans = 1;
          currentBestQuality = quality;
          lastScannedCode = code;
          instructions.textContent = '📊 Stabilizing... (1/3 reads)';
          instructions.style.color = '#3b82f6';
          return;
        }
        
        // Prevent duplicate processing
        if (isProcessing) {
          console.log('Already processing, skipping...');
          return;
        }
        
        isProcessing = true;
        console.log('✅ STABLE barcode detected:', code, 'best quality:', currentBestQuality.toFixed(3), 'consecutive reads:', consecutiveScans);
        
        // Visual feedback - successful scan
        instructions.textContent = '✅ Barcode locked! Capturing high-quality image...';
        instructions.style.color = '#10b981'; // Green success
        
        // WAIT A MOMENT for camera to stabilize, then capture
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // CAPTURE HIGH-QUALITY IMAGE
        let capturedImage: string | null = null;
        try {
          // Get the canvas that Quagga is using
          const canvas = videoContainer.querySelector('canvas');
          if (canvas) {
            // Create a higher quality version of the image
            // Use JPEG quality 0.95 for better text/number readability
            capturedImage = canvas.toDataURL('image/jpeg', 0.95);
            console.log('📸 High-quality image captured from camera');
            console.log(`📐 Image size: ${canvas.width}x${canvas.height}`);
          } else {
            console.warn('⚠️ Could not find canvas to capture image');
          }
        } catch (imgErr) {
          console.error('Failed to capture image:', imgErr);
        }
        
        // Stop scanner and cleanup
        try {
          Quagga.stop();
          Quagga.offDetected(() => {});
        } catch (e) {
          console.error('Error stopping Quagga:', e);
        }
        
        if (document.body.contains(scannerDiv)) {
          document.body.removeChild(scannerDiv);
        }
        setBarcodeScanning(false);
        
        // Show loading
        setRecipeLoading(true);
        
        // Look the decoded barcode up in the authoritative product databases
        // FIRST (fast + accurate). Only if they all miss do we fall back to the
        // slower AI image vision — which also covers curved/odd surfaces the
        // databases have no match for. Reordered 2026-07-18: leading with the
        // GPT vision call made every scan slow and produced wrong guesses even
        // when the barcode was a clean database hit (user reports).
        let productInfo = await lookupBarcode(code);

        if (!productInfo && capturedImage) {
          console.log('⚠️ Not in databases, trying image vision…');
          productInfo = await lookupBarcodeWithImage(capturedImage);
        }

        // Still nothing — add it under a placeholder name the user can rename.
        if (!productInfo) {
          onWarning(t('toasts.productNotFound'));
          productInfo = {
            name: `Item ${code.substring(code.length - 6)}`,
            category: 'other',
            expiryDays: null
          };
        }

        console.log('Product info received:', productInfo);
        
        // Calculate expiry date if we have days
        let expiryDate = '';
        if (productInfo.expiryDays) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + productInfo.expiryDays);
          expiryDate = expiry.toISOString().split('T')[0];
        }
        
        // Add to pantry with pre-filled data
        const newItem: PantryItem = {
          id: `${Date.now()}-${Math.random()}`,
          name: productInfo.name,
          quantity: 1,
          unit: 'pc',
          category: productInfo.category as any,
          expiryDate: expiryDate || undefined
        };
        
        // Add to local state first
        setPantry(prev => [...prev, newItem]);
        
        // If user is logged in, also save to database to prevent disappearing
        if (user) {
          try {
            const dbItem = await pantryService.add({
              name: newItem.name,
              quantity: newItem.quantity,
              unit: newItem.unit,
              category: newItem.category,
              expiryDate: newItem.expiryDate
            });
            console.log('✅ Saved scanned item to database:', dbItem);
            
            // Update the item with the database ID
            setPantry(prev => prev.map(item => 
              item.id === newItem.id ? { ...item, id: dbItem.id } : item
            ));
          } catch (dbError) {
            console.error('⚠️ Failed to save to database:', dbError);
            // Item still in local state, so user can see it
          }
        }
        
        setRecipeLoading(false);
        
        // Show success message
        if (productInfo.name.includes('Scanned Item')) {
          onSuccess(t('toasts.addedWithEdit'));
        } else {
          onSuccess(t('toasts.addedToPantry', { name: productInfo.name }));
        }
        
        setShowImageUpload(false);
        onNavigateToTab('pantry');
      });
      
    } catch (err) {
      console.error('Barcode scanner error:', err);
      onError(t('toasts.failedInitBarcode'));
      setBarcodeScanning(false);
    }
  };
  const handleExpiryScanner = async () => {
    try {
      setExpiryScanning(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;';
      
      video.style.cssText = 'max-width:90%;max-height:60vh;border-radius:12px;';

      const instructions = document.createElement('div');
      instructions.style.cssText = 'color:white;text-align:center;margin-bottom:1rem;font-size:1.1rem;font-weight:600;';
      instructions.innerHTML = '📅 Position expiration date in frame<br/><span style="font-size:0.875rem;opacity:0.8;">Look for: EXP, Best By, Use By, etc.</span>';

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;gap:1rem;margin-top:1rem;';

      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Scan Date';
      captureBtn.style.cssText = 'padding:1rem 2rem;background:#10b981;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:1rem 2rem;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setExpiryScanning(false);
        setShowImageUpload(false);
        setScanMode('menu');
      };

      captureBtn.onclick = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        cleanup();
        setRecipeLoading(true);

        try {
          // Import Tesseract dynamically
          const Tesseract = (await import('tesseract.js')).default;
          
          // Perform OCR
          const { data: { text } } = await Tesseract.recognize(
            canvas.toDataURL('image/jpeg'),
            'eng',
            {
              logger: (m: any) => console.log(m)
            }
          );

          console.log('OCR Result:', text);

          // Parse expiration date from text
          const datePatterns = [
            // Standard numeric formats
            /(?:exp|expires?|expiry|best\s*by|use\s*by|bb)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
            /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
            /(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/,
            
            // Handle "26 FEB 25" or "26 FEB. 25" format
            /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{2,4})/i,
            
            // Handle "FEB 26 25" format
            /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})\s+(\d{2,4})/i,
            
            // Handle "26-FEB-25" format with separators
            /(\d{1,2})[\s\-\.](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?[\s\-\.](\d{2,4})/i,
            
            // Handle "26FEB25" no spaces
            /(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2,4})/i
          ];

          // Month name to number mapping
          const monthMap: { [key: string]: number } = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };

          let foundDate = '';
          let parsedDate: Date | null = null;

          for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
              console.log('📅 Date pattern matched:', match[0]);
              
              // Check if it's a month-name format
              const hasMonth = match[0].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
              
              if (hasMonth) {
                // Parse month-name format (26 FEB 25)
                const monthMatch = match[0].match(/(\d{1,2})\s*[\-\.]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*[\-\.]?(\d{2,4})/i);
                
                if (monthMatch) {
                  const day = parseInt(monthMatch[1]);
                  const month = monthMap[monthMatch[2].toLowerCase()];
                  let year = parseInt(monthMatch[3]);
                  
                  // Handle 2-digit year
                  if (year < 100) {
                    year += 2000;
                  }
                  
                  parsedDate = new Date(year, month, day);
                  console.log('✅ Parsed date with month name:', parsedDate);
                  break;
                }
              } else {
                // Standard numeric format
                foundDate = match[1];
                break;
              }
            }
          }

          // If we found a date with month name, use it
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            const formattedDate = parsedDate.toISOString().split('T')[0];
            setDetectedExpiry(formattedDate);
            onSuccess(t('toasts.detectedExpiry', { date: formattedDate }));

            setNewPantryItem(prev => ({
              ...prev,
              expiryDate: formattedDate
            }));
            setShowAddPantry(true);
          } else if (foundDate) {
            // Try parsing standard numeric format
            let dateObj = new Date(foundDate);
            if (isNaN(dateObj.getTime())) {
              const parts = foundDate.split(/[\/-]/);
              if (parts.length === 3) {
                dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
              }
            }

            if (!isNaN(dateObj.getTime())) {
              const formattedDate = dateObj.toISOString().split('T')[0];
              setDetectedExpiry(formattedDate);
              onSuccess(t('toasts.detectedExpiry', { date: formattedDate }));

              setNewPantryItem(prev => ({
                ...prev,
                expiryDate: formattedDate
              }));
              setShowAddPantry(true);
            } else {
              onWarning(t('toasts.couldNotParseDate'));
            }
          } else {
            onWarning(t('toasts.noExpiryFound'));
          }

        } catch (err) {
          console.error('OCR error:', err);
          onError(t('toasts.failedReadExpiry'));
        } finally {
          setRecipeLoading(false);
          setShowImageUpload(false);
        }
      };

      cancelBtn.onclick = cleanup;

      modal.appendChild(instructions);
      modal.appendChild(video);
      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

    } catch (err) {
      console.error('Camera access error:', err);
      onError(t('toasts.cameraAccessDenied'));
      setExpiryScanning(false);
    }
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError(t('toasts.pleaseUploadImage'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError(t('toasts.imageTooLarge'));
      return;
    }

    setRecipeLoading(true);

    try {
      // Create FormData to send file
      const formData = new FormData();
      formData.append('file', file);

      // Send to backend
      const response = await authFetch(`${API_BASE}/vision/analyze-ingredients`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.ingredients.length > 0) {
        if (cameraSource === 'pantry') {
          // Add to pantry (persisted to the database)
          await addScannedItemsToPantry(data.ingredients);

          // Close modal and switch to pantry tab
          setShowImageUpload(false);
          onNavigateToTab('pantry');
        } else {
          // Add to recipe ingredients
          const newIngredients = data.ingredients.filter(
            (ing: string) => !ingredientTags.includes(ing.toLowerCase())
          );

          setIngredientTags(prev => [...prev, ...newIngredients]);
          onSuccess(t('toasts.foundIngredients', { count: data.ingredients.length }));

          // Close modal and switch to recipes tab
          setShowImageUpload(false);
          onNavigateToTab('recipes');
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        onWarning(t('toasts.noItemsDetected'));
      }

    } catch (err) {
      console.error('Image analysis error:', err);
      onError(t('toasts.failedAnalyzeImage'));
    } finally {
      setRecipeLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };
  const analyzeReceiptImage = async (canvas: HTMLCanvasElement) => {
    setRecipeLoading(true);
    try {
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) {
        throw new Error('Failed to capture image from camera');
      }

      const formData = new FormData();
      formData.append('file', blob, 'receipt.jpg');

      const response = await authFetch(`${API_BASE}/vision/analyze-receipt`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.items?.length > 0) {
        setReceiptItems(data.items.map((item: any) => {
          const matchedFood = searchFoods(item.name, i18n.language || 'en', 1)[0];
          return {
            id: `${Date.now()}-${Math.random()}`,
            name: item.name,
            quantity: item.quantity ?? null,
            unit: item.unit,
            category: item.category,
            confidence: item.confidence,
            rawText: item.raw_text || '',
            selected: item.confidence !== 'low',
            emoji: matchedFood?.emoji,
          };
        }));
        setReceiptRejectedCount(data.rejected_lines_count || 0);
        setShowReceiptReview(true);
      } else {
        onWarning(t('toasts.noReceiptItemsDetected'));
      }
    } catch (err) {
      console.error('Receipt analysis error:', err);
      onError(t('toasts.failedAnalyzeReceipt'));
    } finally {
      setRecipeLoading(false);
      setShowImageUpload(false);
    }
  };
  const handleReceiptScanner = async () => {
    try {
      setReceiptScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;';

      video.style.cssText = 'max-width:90%;max-height:60vh;border-radius:12px;';

      const instructions = document.createElement('div');
      instructions.style.cssText = 'color:white;text-align:center;margin-bottom:1rem;font-size:1.1rem;font-weight:600;';
      instructions.innerHTML = '🧾 Position the receipt in frame';

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;gap:1rem;margin-top:1rem;';

      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Scan Receipt';
      captureBtn.style.cssText = 'padding:1rem 2rem;background:#ec4899;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:1rem 2rem;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setReceiptScanning(false);
        setShowImageUpload(false);
        setScanMode('menu');
      };

      captureBtn.onclick = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        cleanup();
        await analyzeReceiptImage(canvas);
      };

      cancelBtn.onclick = cleanup;

      modal.appendChild(instructions);
      modal.appendChild(video);
      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

    } catch (err) {
      console.error('Camera access error:', err);
      onError(t('toasts.cameraAccessDenied'));
      setReceiptScanning(false);
    }
  };
  const confirmReceiptItems = async () => {
    const selected = receiptItems.filter(item => item.selected);
    if (selected.length === 0) {
      setShowReceiptReview(false);
      setReceiptItems([]);
      setScanMode('menu');
      return;
    }

    const missingQuantity = selected.filter(item => !item.quantity || item.quantity <= 0);
    if (missingQuantity.length > 0) {
      onWarning(t('toasts.receiptMissingQuantity', { count: missingQuantity.length }));
      return;
    }

    try {
      const savedItems = await Promise.all(selected.map(item =>
        pantryService.add({
          name: item.name,
          quantity: item.quantity as number,
          unit: item.unit,
          category: item.category,
          emoji: item.emoji,
        })
      ));
      setPantry(prev => [...prev, ...savedItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date || undefined,
        emoji: item.emoji || undefined,
      }))]);
      onSuccess(t('toasts.addedItemsToPantry', { count: savedItems.length }));
      onNavigateToTab('pantry');
    } catch (err) {
      console.error('Failed to save receipt items:', err);
      onError(t('toasts.failedAddSomeItems'));
    } finally {
      setShowReceiptReview(false);
      setReceiptItems([]);
      setReceiptRejectedCount(0);
      setScanMode('menu');
    }
  };

  return (
    <>
      {showImageUpload && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: cardBg,
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: isMobile ? '12px' : '16px',
            maxWidth: isMobile ? '95vw' : '500px',
            width: isMobile ? '95vw' : '90%',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3 style={{
              marginTop: 0,
              fontSize: isMobile ? '1.25rem' : '1.5rem'
            }}>
              {scanMode === 'menu' ? `📷 ${t('scan.scanItems')}` : scanMode === 'barcode' ? `📊 ${t('scan.barcodeScanner')}` : scanMode === 'expiry' ? `📅 ${t('scan.expiryDateScanner')}` : scanMode === 'receipt' ? `🧾 ${t('scan.receiptUploadTitle')}` : `📷 ${t('scan.aiScanner')}`}
            </h3>
            <p style={{ color: mutedText, fontSize: isMobile ? '0.875rem' : '1rem' }}>
              {scanMode === 'menu' && (cameraSource === 'pantry'
                ? t('scan.chooseAddPantry')
                : t('scan.chooseAddIngredients'))}
              {scanMode === 'camera' && t('scan.aiIdentify')}
              {scanMode === 'barcode' && t('scan.barcodeScannerDesc')}
              {scanMode === 'expiry' && t('scan.expiryScannerDesc')}
              {scanMode === 'upload' && t('scan.aiScannerDesc')}
              {scanMode === 'receipt' && t('scan.receiptUploadDesc')}
            </p>

            {recipeLoading && (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#f0f9ff',
                borderRadius: '12px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
                <div style={{ fontWeight: '600', color: '#1e40af' }}>
                  {scanMode === 'barcode' ? t('scan.lookingUp') :
                  scanMode === 'expiry' ? t('scan.readingExpiry') :
                  scanMode === 'receipt' ? t('scan.readingReceipt') :
                  t('scan.analyzing')}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  {t('scan.mayTakeFewSecs')}
                </div>
              </div>
            )}

            {scanMode === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* AI Camera Button */}
                <button
                  onClick={() => {
                    setScanMode('camera');
                    handleCameraCapture();
                  }}
                  disabled={recipeLoading}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: '#8b5cf6',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '600',
                    border: 'none',
                    opacity: recipeLoading ? 0.5 : 1,
                    pointerEvents: recipeLoading ? 'none' : 'auto',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📸</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>AI Camera Scanner</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        Identify multiple items automatically
                      </div>
                    </div>
                  </div>
                </button>

                {/* Barcode Scanner Button */}
                <button
                  onClick={() => {
                    setScanMode('barcode');
                    handleBarcodeScanner();
                  }}
                  disabled={recipeLoading}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '600',
                    border: 'none',
                    opacity: recipeLoading ? 0.5 : 1,
                    pointerEvents: recipeLoading ? 'none' : 'auto',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📊</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>{t('scan.barcodeScannerTitle')}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        {t('scan.barcodeScannerDesc')}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expiry Date Scanner Button */}
                <button
                  onClick={() => {
                    setScanMode('expiry');
                    handleExpiryScanner();
                  }}
                  disabled={recipeLoading}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: '#f59e0b',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '600',
                    border: 'none',
                    opacity: recipeLoading ? 0.5 : 1,
                    pointerEvents: recipeLoading ? 'none' : 'auto',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📅</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>{t('scan.expiryScannerTitle')}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        {t('scan.expiryScannerDesc')}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Upload Image Button */}
                <label style={{
                  display: 'block',
                  width: '100%',
                  padding: '1rem',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: '600',
                  opacity: recipeLoading ? 0.5 : 1,
                  pointerEvents: recipeLoading ? 'none' : 'auto',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🖼️</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>Upload Photo</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        Choose from gallery for AI analysis
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setScanMode('upload');
                      handleImageUpload(e);
                    }}
                    disabled={recipeLoading}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Receipt Scanner Button (pantry only — receipts always add to pantry) */}
                {cameraSource === 'pantry' && (
                  <button
                    onClick={() => {
                      setScanMode('receipt');
                      handleReceiptScanner();
                    }}
                    disabled={recipeLoading}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '1rem',
                      background: '#ec4899',
                      color: 'white',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: '600',
                      border: 'none',
                      opacity: recipeLoading ? 0.5 : 1,
                      pointerEvents: recipeLoading ? 'none' : 'auto',
                      fontSize: isMobile ? '0.9rem' : '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🧾</span>
                      <div>
                        <div style={{ fontWeight: '700' }}>{t('scan.receiptUploadTitle')}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                          {t('scan.receiptUploadDesc')}
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowImageUpload(false);
                    setScanMode('menu');
                  }}
                  disabled={recipeLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#f3f4f6',
                    marginTop: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    opacity: recipeLoading ? 0.5 : 1,
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showReceiptReview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: isMobile ? '1rem' : 0
        }}>
          <div style={{
            background: cardBg,
            padding: isMobile ? '1.25rem' : '2rem',
            borderRadius: isMobile ? '12px' : '16px',
            maxWidth: isMobile ? '95vw' : '560px',
            width: isMobile ? '95vw' : '90%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3 style={{ marginTop: 0, fontSize: isMobile ? '1.15rem' : '1.4rem' }}>
              🧾 {t('scan.receiptReviewTitle')}
            </h3>
            <p style={{ color: mutedText, fontSize: isMobile ? '0.85rem' : '0.95rem', marginTop: 0 }}>
              {t('scan.receiptReviewDesc')}
            </p>
            {receiptRejectedCount > 0 && (
              <p style={{ color: mutedText, fontSize: '0.8rem', marginTop: '-0.5rem' }}>
                {t('scan.receiptRejectedLines', { count: receiptRejectedCount })}
              </p>
            )}

            <div style={{ overflowY: 'auto', flex: 1, margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {receiptItems.length === 0 && (
                <p style={{ color: mutedText, textAlign: 'center', padding: '1rem' }}>
                  {t('toasts.noReceiptItemsDetected')}
                </p>
              )}
              {receiptItems.map(item => {
                const confidenceColor = item.confidence === 'high' ? '#10b981' : item.confidence === 'medium' ? '#f59e0b' : '#ef4444';
                const categoryEmoji: Record<string, string> = {
                  produce: '🥬', dairy: '🥛', meat: '🍖', canned: '🥫', grains: '🌾',
                  breakfast: '🥞', beverages: '🥤', snacks: '🍿', frozen: '🧊',
                  bakery: '🍞', condiments: '🧂', other: '📦'
                };
                const displayEmoji = item.emoji || categoryEmoji[item.category] || '📦';
                const needsQuantity = item.selected && (item.quantity === null || item.quantity <= 0);
                return (
                  <div key={item.id} style={{
                    border: `1px solid ${item.selected ? confidenceColor : '#e5e7eb'}`,
                    borderRadius: '10px',
                    padding: '0.75rem',
                    opacity: item.selected ? 1 : 0.55,
                    background: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => setReceiptItems(prev => prev.map(it =>
                          it.id === item.id ? { ...it, selected: e.target.checked } : it
                        ))}
                        style={{ marginTop: '0.6rem', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '1.4rem', marginTop: '0.3rem', flexShrink: 0 }}>{displayEmoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, name: e.target.value } : it
                            ))}
                            style={{
                              flex: 1, padding: '0.5rem', border: '1px solid #e5e7eb',
                              borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, minWidth: 0
                            }}
                          />
                          <span title={t(`scan.confidence${item.confidence.charAt(0).toUpperCase()}${item.confidence.slice(1)}`)} style={{
                            fontSize: '0.7rem', fontWeight: 700, color: confidenceColor,
                            border: `1px solid ${confidenceColor}`, borderRadius: '999px',
                            padding: '0.15rem 0.5rem', whiteSpace: 'nowrap', flexShrink: 0
                          }}>
                            {t(`scan.confidence${item.confidence.charAt(0).toUpperCase()}${item.confidence.slice(1)}`)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity ?? ''}
                            placeholder={t('scan.qtyPlaceholder')}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, quantity: e.target.value === '' ? null : parseFloat(e.target.value) } : it
                            ))}
                            style={{
                              width: '70px', padding: '0.4rem',
                              border: needsQuantity ? '1px solid #ef4444' : '1px solid #e5e7eb',
                              background: needsQuantity ? '#fef2f2' : 'white',
                              borderRadius: '6px', fontSize: '0.85rem'
                            }}
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, unit: e.target.value } : it
                            ))}
                            style={{ width: '70px', padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }}
                          />
                          <select
                            value={item.category}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, category: e.target.value } : it
                            ))}
                            style={{ flex: 1, padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', minWidth: '110px' }}
                          >
                            <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                            <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                            <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                            <option value="canned">🥫 {t('pantry.categories.canned')}</option>
                            <option value="grains">🌾 {t('pantry.categories.grains')}</option>
                            <option value="breakfast">🥞 {t('pantry.categories.breakfast')}</option>
                            <option value="beverages">🥤 {t('pantry.categories.beverages')}</option>
                            <option value="snacks">🍿 {t('pantry.categories.snacks')}</option>
                            <option value="frozen">🧊 {t('pantry.categories.frozen')}</option>
                            <option value="bakery">🍞 {t('pantry.categories.bakery')}</option>
                            <option value="condiments">🧂 {t('pantry.categories.condiments')}</option>
                            <option value="other">📦 {t('pantry.categories.other')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowReceiptReview(false);
                  setReceiptItems([]);
                  setReceiptRejectedCount(0);
                  setScanMode('menu');
                }}
                style={{
                  flex: 1, padding: '0.85rem', background: '#f3f4f6', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmReceiptItems}
                disabled={receiptItems.filter(i => i.selected).length === 0}
                style={{
                  flex: 2, padding: '0.85rem', background: '#8b5cf6', color: 'white', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: isMobile ? '0.9rem' : '1rem',
                  opacity: receiptItems.filter(i => i.selected).length === 0 ? 0.5 : 1
                }}
              >
                {t('scan.addSelectedItems', { count: receiptItems.filter(i => i.selected).length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
