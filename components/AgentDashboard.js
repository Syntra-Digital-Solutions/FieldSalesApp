import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView, RefreshControl, Platform, Linking } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { KeyboardAvoidingView, Platform as RNPlatform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/config/supabaseClient';
import { saveSaleOffline, getPendingCount, getQueuedSales } from '../src/services/database';
import { generateAndSharePDF } from '../src/utils/pdf';
import ReportActions from './ReportActions';
import AccountSettingsModal from './AccountSettingsModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import VoiceNoteModal from './VoiceNoteModal';
import HelpGuideModal from './HelpGuideModal';
import Sidebar from './Sidebar';
import CustomerNoteModal from './CustomerNoteModal';
import DailyChecklistModal from './DailyChecklistModal';
import TrainingQuizModal from './TrainingQuizModal';
import { registerForPushAndSave } from '../src/utils/notifications';
import LessonsModal from './LessonsModal';
import AISupportModal from './AISupportModal';

import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/i18n/LanguageContext';

const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const isSameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const isSameYear = (a, b) => a.getFullYear() === b.getFullYear();

const AGENT_CACHE_KEY = '@agent_cache_v1';

export default function AgentDashboard({ user, onLogout }) {
  const [paymentType, setPaymentType] = useState('cash');
  const [momoRef, setMomoRef] = useState('');
    const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = { ...theme, white: theme.card };
  const styles = getStyles(C);
  const [screen, setScreen] = useState('overview'); 

  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locatingNow, setLocatingNow] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [products, setProducts] = useState([]);
  const [managerPhone, setManagerPhone] = useState('0535623106');
  const [mySales, setMySales] = useState([]);
  const [dailyTarget, setDailyTarget] = useState(50);
  const [myIssues, setMyIssues] = useState([]);
  const [myCounts, setMyCounts] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [myEditRequests, setMyEditRequests] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [storeInput, setStoreInput] = useState('');  
  const [checkedIn, setCheckedIn] = useState(false);

  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesStore, setNotesStore] = useState('');
  const toggleCheckIn = async () => {
    const newStatus = !checkedIn;
    setCheckedIn(newStatus);
    try { await supabase.from('profiles').update({ checked_in: newStatus, checked_in_at: new Date().toISOString() }).eq('id', user.id); } catch (e) {}
  };

  const [locationInput, setLocationInput] = useState('');
  const [saleItems, setSaleItems] = useState([{ product: null, itemsSold: '', actualCash: '', isPack: false, packCount: '', unitsPerPack: '', leftoverUnits: '' }]);
  const [linkedRouteId, setLinkedRouteId] = useState(null);

  const [countModalProduct, setCountModalProduct] = useState(null);
  const [countInput, setCountInput] = useState('');

  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectProduct, setCollectProduct] = useState(null);
  const [collectQty, setCollectQty] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [voiceNotesOpen, setVoiceNotesOpen] = useState(false);
  const [voiceReference, setVoiceReference] = useState('');
  const [returnToSale, setReturnToSale] = useState(false);
  const [scanTarget, setScanTarget] = useState(null); 

  const [editingSale, setEditingSale] = useState(null);
  const [newItemsSold, setNewItemsSold] = useState('');
  const [newActualCash, setNewActualCash] = useState('');
  const [editReason, setEditReason] = useState('');
  const [selectedReasonChip, setSelectedReasonChip] = useState(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);

  const [correctionPeriod, setCorrectionPeriod] = useState('all');
  const [correctionCustomYear, setCorrectionCustomYear] = useState('');
  const [correctionCustomMonth, setCorrectionCustomMonth] = useState('');
  const [correctionCustomDay, setCorrectionCustomDay] = useState('');

  const [stockPeriod, setStockPeriod] = useState('all');
  const [stockCustomYear, setStockCustomYear] = useState('');
  const [stockCustomMonth, setStockCustomMonth] = useState('');
  const [stockCustomDay, setStockCustomDay] = useState('');

  const [historyPeriod, setHistoryPeriod] = useState('day');
  const [customYear, setCustomYear] = useState('');
  const [customMonth, setCustomMonth] = useState('');
  const [customDay, setCustomDay] = useState('');

  const loadCache = async (key) => {
    try { const raw = await AsyncStorage.getItem(`${AGENT_CACHE_KEY}_${key}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const saveCache = async (key, data) => {
    try { await AsyncStorage.setItem(`${AGENT_CACHE_KEY}_${key}`, JSON.stringify(data)); } catch {}
  };

  const fetchRoutes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('routes').select('id, store_name, status').eq('agent_id', user.id).order('created_at', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) { setRoutes(data); await saveCache('routes', data); }
      else { const c = await loadCache('routes'); setRoutes(c || []); }
    } catch { const c = await loadCache('routes'); if (c) setRoutes(c); }
  }, [user.id]);
  
  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('id, name, unit_price, commission_rate').eq('active', true).order('name', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) { setProducts(data); await saveCache('products', data); }
      else { const c = await loadCache('products'); setProducts(c || []); }
    } catch { const c = await loadCache('products'); if (c) setProducts(c); }
  }, []);

  const fetchMySales = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('sales').select('id, product_id, items_sold, actual_cash, commission_earned, store_name, location_label, pack_count, units_per_pack, payment_type, momo_ref, created_at').eq('worker_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) { setMySales(data); await saveCache('sales', data); }
      else { const c = await loadCache('sales'); setMySales(c || []); }
    } catch { const c = await loadCache('sales'); if (c) setMySales(c); }
  }, [user.id]);

  const fetchMyIssues = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('agent_inventory').select('id, product_id, quantity_issued, issued_at').eq('agent_id', user.id).order('issued_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) { setMyIssues(data); await saveCache('issues', data); }
      else { const c = await loadCache('issues'); setMyIssues(c || []); }
    } catch { const c = await loadCache('issues'); if (c) setMyIssues(c); }
  }, [user.id]);

  const fetchMyCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('stock_counts').select('id, product_id, counted_remaining, counted_at').eq('agent_id', user.id).order('counted_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) { setMyCounts(data); await saveCache('counts', data); }
      else { const c = await loadCache('counts'); setMyCounts(c || []); }
    } catch { const c = await loadCache('counts'); if (c) setMyCounts(c); }
  }, [user.id]);

  const fetchMyEditRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('edit_requests').select('id, sale_id, new_items_sold, new_actual_cash, reason, status, created_at').eq('agent_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) { setMyEditRequests(data); await saveCache('edits', data); }
      else { const c = await loadCache('edits'); setMyEditRequests(c || []); }
    } catch { const c = await loadCache('edits'); if (c) setMyEditRequests(c); }
  }, [user.id]);

  const refreshPendingCount = useCallback(async () => {
    try { setPendingCount(await getPendingCount()); setOfflineQueue(await getQueuedSales()); } catch {}
  }, []);

  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const fetchManagerPhone = useCallback(async () => { setManagerPhone('0535623106'); }, []);

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [cSales, cIssues, cCounts, cRoutes, cProducts, cEdits, cTarget] = await Promise.all([
        loadCache('sales'), loadCache('issues'), loadCache('counts'),
        loadCache('routes'), loadCache('products'), loadCache('edits'), loadCache('target'),
      ]);
      if (cSales) setMySales(cSales);
      if (cIssues) setMyIssues(cIssues);
      if (cCounts) setMyCounts(cCounts);
      if (cRoutes) setRoutes(cRoutes);
      if (cProducts) setProducts(cProducts);
      if (cEdits) setMyEditRequests(cEdits);
      if (cTarget) setDailyTarget(cTarget);
    } catch (e) { console.log('Cache preload error', e); }

    try {
      await Promise.all([fetchRoutes(), fetchProducts(), fetchMySales(), fetchMyIssues(), fetchMyCounts(), fetchMyEditRequests(), fetchManagerPhone(), refreshPendingCount()]);
      const { data: profileData } = await supabase.from('profiles').select('daily_target').eq('id', user.id).single();
      if (profileData?.daily_target) { setDailyTarget(profileData.daily_target); await saveCache('target', profileData.daily_target); }
      setLastSyncedAt(new Date());
    } catch (err) {
      console.log('Offline: using cached data');
    } finally {
      setLoadingData(false);
    }
  }, [fetchRoutes, fetchProducts, fetchMySales, fetchMyIssues, fetchMyCounts, fetchMyEditRequests, fetchManagerPhone, refreshPendingCount, user.id]);

  const syncedAgoText = () => {
    if (!lastSyncedAt) return 'Not synced yet';
    const secs = Math.floor((new Date() - lastSyncedAt) / 1000);
    if (secs < 60) return 'Synced just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `Synced ${mins} min ago`;
    return `Synced ${Math.floor(mins / 60)} hr ago`;
  };

  const requestLocation = useCallback(async () => {
    setLocatingNow(true);
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) { setErrorMsg('This browser does not support location.'); setLocatingNow(false); return; }
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setLocation({ coords }); setErrorMsg(null);
            try {
              const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`, { headers: { 'Accept-Language': 'en' } });
              const json = await resp.json(); const addr = json.address || {};
              const label = [addr.city || addr.town || addr.village || addr.county, addr.state].filter(Boolean).join(', ');
              if (label) { setLocationLabel(label); setLocationInput(label); } else setLocationInput(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
            } catch { setLocationInput(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`); }
            setLocatingNow(false);
          },
          (err) => { setErrorMsg('Could not get location: ' + err.message); setLocatingNow(false); }
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Location permission denied.'); setLocatingNow(false); return; }
      const pos = await Location.getCurrentPositionAsync({}); setLocation(pos);
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (geocoded?.[0]) {
          const g = geocoded[0]; const label = [g.city || g.subregion, g.region].filter(Boolean).join(', ');
          if (label) { setLocationLabel(label); setLocationInput(label); }
        }
      } catch {}
    } catch { setErrorMsg('Could not get location.'); }
    setLocatingNow(false);
  }, []);

  const [lessonsModalOpen, setLessonsModalOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
    requestLocation();
    registerForPushAndSave(user.id);
  }, [fetchAllData, requestLocation]);

  const onRefresh = async () => { setRefreshing(true); await fetchAllData(); setRefreshing(false); };
  const productName = (id) => products.find((p) => p.id === id)?.name || 'Product';

  const stockByProduct = (() => {
    const issuedMap = {}; myIssues.forEach((i) => { issuedMap[i.product_id] = (issuedMap[i.product_id] || 0) + i.quantity_issued; });
    const soldMap = {}; mySales.forEach((s) => { soldMap[s.product_id] = (soldMap[s.product_id] || 0) + s.items_sold; });
    const latestCountMap = {}; myCounts.forEach((c) => { if (!latestCountMap[c.product_id] || new Date(c.counted_at) > new Date(latestCountMap[c.product_id].counted_at)) latestCountMap[c.product_id] = c; });
    const productIds = new Set([...Object.keys(issuedMap), ...Object.keys(soldMap), ...Object.keys(latestCountMap)]);
    return Array.from(productIds).map((pid) => {
      const issued = issuedMap[pid] || 0; const sold = soldMap[pid] || 0;
      return { productId: pid, name: productName(pid), issued, sold, systemRemaining: Math.max(0, issued - sold), countedRemaining: latestCountMap[pid]?.counted_remaining };
    });
  })();

  const totalCollectedToday = mySales.filter((s) => isSameDay(new Date(s.created_at), new Date())).reduce((sum, s) => sum + Number(s.actual_cash), 0);

  const getStreak = () => {
    if (!mySales || mySales.length === 0) return 0;
    const uniqueDays = [...new Set(mySales.map(s => new Date(s.created_at).toDateString()))];
    let streak = 0; let today = new Date();
    const hasToday = uniqueDays.includes(today.toDateString());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const hasYesterday = uniqueDays.includes(yesterday.toDateString());
    if (!hasToday && !hasYesterday) return 0; 
    let checkDate = hasToday ? today : yesterday;
    while (uniqueDays.includes(checkDate.toDateString())) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    return streak;
  };
  const currentStreak = getStreak();
  const pendingEditCount = myEditRequests.filter((r) => r.status === 'pending').length;

  const callManager = () => { if (managerPhone) Linking.openURL(`tel:${managerPhone}`); };

  const repeatLastSale = () => {
    if (mySales.length === 0) { Alert.alert('No previous sale'); return; }
    const last = mySales[0]; const product = products.find((p) => p.id === last.product_id);
    setStoreInput(last.store_name || ''); setLinkedRouteId(null); setLocationInput(locationLabel || '');
    setSaleItems([{ product: product || products[0] || null, itemsSold: String(last.items_sold), actualCash: String(last.actual_cash) }]);
    setSaleModalOpen(true); setPaymentType('cash'); setMomoRef('');
  };
  
  const openSaleModal = (route) => {
    setStoreInput(route ? route.store_name : ''); setLinkedRouteId(route ? route.id : null);
    setLocationInput(locationLabel || '');
    setSaleItems([{ product: products[0] || null, itemsSold: '', actualCash: '', isPack: false, packCount: '', unitsPerPack: '', leftoverUnits: '' }]);
    setSaleModalOpen(true);
  };

  const openSaleModalFromVoice = (transcript) => {
    setLinkedRouteId(null); setLocationInput(locationLabel || ''); setPaymentType('cash'); setMomoRef(''); setVoiceReference(transcript);
    const lowerText = transcript.toLowerCase();
    let isPack = false; let packCount = ''; let unitsPerPack = ''; let leftoverUnits = ''; let itemsSold = ''; let actualCash = ''; let storeGuess = '';
    let foundProduct = null;
    const productMatch = lowerText.match(/(?:product|item)\s+([a-z\s]+)/);
    if (productMatch) { const spokenProduct = productMatch[1].trim(); foundProduct = products.find(p => spokenProduct.includes(p.name.toLowerCase())); }
    if (!foundProduct) foundProduct = products.find(p => lowerText.includes(p.name.toLowerCase()));
    const packMatch = lowerText.match(/(?:packs?)\s*(\d+)/); if (packMatch) { isPack = true; packCount = packMatch[1]; }
    const unitsMatch = lowerText.match(/(?:units?|pieces?|pcs?)\s*(\d+)/); if (unitsMatch) unitsPerPack = unitsMatch[1];
    const leftMatch = lowerText.match(/(?:leftover|left over|left)\s*(\d+)/); if (leftMatch) leftoverUnits = leftMatch[1];
    const cashMatch = lowerText.match(/(?:cash|collected|paid|ghs|cedis)\s*(\d+(?:\.\d+)?)/); if (cashMatch) actualCash = cashMatch[1];
    const storeMatch = lowerText.match(/(?:store|shop|market|customer)\s+([a-z0-9\s]+)/);
    if (storeMatch) { let rawStore = storeMatch[1]; rawStore = rawStore.split(/packs?|units?|leftover|cash|ghs/)[0].trim(); if (rawStore.length > 2) storeGuess = rawStore; }
    if (isPack && packCount && unitsPerPack) { itemsSold = String(parseInt(packCount) * parseInt(unitsPerPack) + (parseInt(leftoverUnits) || 0)); }
    else { const numbers = lowerText.match(/\b\d+\b/g); if (numbers) itemsSold = numbers[0]; }
    if (!actualCash && itemsSold && foundProduct) actualCash = String(parseFloat(itemsSold) * foundProduct.unit_price);
    if (!storeGuess) setStoreInput(''); else setStoreInput(storeGuess.charAt(0).toUpperCase() + storeGuess.slice(1));
    setSaleItems([{ product: foundProduct || products[0] || null, itemsSold, actualCash, isPack, packCount, unitsPerPack, leftoverUnits }]);
    setSaleModalOpen(true);
  };

  const updateSaleItem = (index, field, value) => setSaleItems((prev) => prev.map((item, i) => {
    if (i !== index) return item;
    const updated = { ...item, [field]: value };
    if (updated.isPack && ['packCount','unitsPerPack','leftoverUnits','isPack'].includes(field)) {
      const packs = parseInt(updated.packCount, 10) || 0; const perPack = parseInt(updated.unitsPerPack, 10) || 0; const leftover = parseInt(updated.leftoverUnits, 10) || 0;
      updated.itemsSold = perPack > 0 ? String(packs * perPack + leftover) : '';
    }
    return updated;
  }));

  const addSaleItemLine = () => setSaleItems((prev) => [...prev, { product: products[0] || null, itemsSold: '', actualCash: '', isPack: false, packCount: '', unitsPerPack: '', leftoverUnits: '' }]);
  const removeSaleItemLine = (index) => setSaleItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const submitSale = async () => {
    if (!storeInput.trim()) { Alert.alert('Error', 'Enter the store or customer name.'); return; }
    const validItems = saleItems.filter((item) => {
      if (!item.product || !item.itemsSold || parseInt(item.itemsSold, 10) <= 0) return false;
      if (paymentType === 'credit') return true;
      return item.actualCash !== '' && !isNaN(parseFloat(item.actualCash));
    });
    if (validItems.length === 0) { Alert.alert('Error', 'Fill in at least one item.'); return; }
    for (const item of validItems) {
      const sold = parseInt(item.itemsSold, 10); const cash = parseFloat(item.actualCash);
      const expectedCash = sold * item.product.unit_price;
      const payload = { worker_id: user.id, product_id: item.product.id, items_sold: sold, expected_cash: expectedCash, actual_cash: paymentType === 'credit' ? 0 : cash, payment_type: paymentType, momo_ref: paymentType === 'momo' ? momoRef.trim() : null, commission_earned: 0, store_name: storeInput.trim(), latitude: location?.coords?.latitude || null, longitude: location?.coords?.longitude || null, location_label: locationInput.trim() || null, pack_count: item.isPack ? parseInt(item.packCount, 10) || null : null, units_per_pack: item.isPack ? parseInt(item.unitsPerPack, 10) || null : null };
      const result = await saveSaleOffline(payload);
      if (!result.success) { Alert.alert('Error', `Could not save ${item.product.name} locally.`); return; }
      try {
        const { data: insertedSale, error } = await supabase.from('sales').insert([payload]).select().single();
        if (!error && insertedSale) await supabase.from('sale_alerts').insert([{ sale_id: insertedSale.id, agent_id: user.id }]);
      } catch {}
    }
    if (linkedRouteId) {
      try { await supabase.from('routes').update({ status: 'Checked In' }).eq('id', linkedRouteId); } catch {}
      setRoutes((prev) => prev.map((r) => (r.id === linkedRouteId ? { ...r, status: 'Checked In' } : r)));
    }
      Alert.alert('Saved', `${validItems.length} item(s) recorded at ${storeInput}.`);
    setSaleModalOpen(false); 
    refreshPendingCount(); 
    
    const soldBefore = mySales.filter((s) => isSameDay(new Date(s.created_at), new Date())).reduce((sum, s) => sum + s.items_sold, 0);
    const justSold = validItems.reduce((sum, i) => sum + parseInt(i.itemsSold, 10), 0);
    if (soldBefore < dailyTarget && (soldBefore + justSold) >= dailyTarget) {
      setShowCelebration(true);
    }

    fetchMySales();
  };

  const openCountModal = (item) => { setCountModalProduct(item); setCountInput(item.countedRemaining != null ? String(item.countedRemaining) : String(item.systemRemaining)); };
  const submitCount = async () => {
    const count = parseInt(countInput, 10); if (isNaN(count) || count < 0) { Alert.alert('Error', 'Enter a valid number.'); return; }
    try {
      const { error } = await supabase.from('stock_counts').insert([{ agent_id: user.id, product_id: countModalProduct.productId, counted_remaining: count }]);
      if (error) throw error;
      Alert.alert('Saved', `Remaining recorded as ${count}.`); setCountModalProduct(null); fetchMyCounts();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const openCollectModal = () => { setCollectProduct(products[0] || null); setCollectQty(''); setCollectModalOpen(true); };
  const submitCollected = async () => {
    const qty = parseInt(collectQty, 10); if (!collectProduct) { Alert.alert('Error', 'Select a product.'); return; } if (!qty || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity.'); return; }
    try {
      const { error } = await supabase.from('agent_inventory').insert([{ agent_id: user.id, product_id: collectProduct.id, quantity_issued: qty, source: 'agent' }]);
      if (error) throw error;
      Alert.alert('Saved', `Recorded ${qty} collected.`); setCollectModalOpen(false); fetchMyIssues();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const openEditRequest = (sale) => { setEditingSale(sale); setNewItemsSold(String(sale.items_sold)); setNewActualCash(String(sale.actual_cash)); setEditReason(''); setSelectedReasonChip(null); };
  const editReasonOptions = ['Wrong quantity', 'Wrong price/cash amount', 'Wrong store name', 'Entered by mistake', 'Other'];
  const selectReasonChip = (option) => { setSelectedReasonChip(option); if (option !== 'Other') setEditReason(option); else setEditReason(''); };
  const submitEditRequest = async () => {
    if (!selectedReasonChip) { Alert.alert('Error', 'Select a reason.'); return; }
    if (selectedReasonChip === 'Other' && !editReason.trim()) { Alert.alert('Error', 'Type a reason.'); return; }
    try {
      const { error } = await supabase.from('edit_requests').insert([{ sale_id: editingSale.id, agent_id: user.id, new_items_sold: parseInt(newItemsSold, 10), new_actual_cash: parseFloat(newActualCash), reason: editReason.trim() }]);
      if (error) throw error;
      Alert.alert('Sent', 'Edit request sent.'); setEditingSale(null); fetchMyEditRequests();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const matchesCorrectionPeriod = (dateStr) => { const d = new Date(dateStr); const now = new Date(); if (correctionPeriod === 'day') return isSameDay(d, now); if (correctionPeriod === 'month') return isSameMonth(d, now); if (correctionPeriod === 'year') return isSameYear(d, now); if (correctionPeriod === 'all') return true; const y = correctionCustomYear ? parseInt(correctionCustomYear, 10) : null; const m = correctionCustomMonth ? parseInt(correctionCustomMonth, 10) : null; const dd = correctionCustomDay ? parseInt(correctionCustomDay, 10) : null; if (y && d.getFullYear() !== y) return false; if (m && d.getMonth() + 1 !== m) return false; if (dd && d.getDate() !== dd) return false; return y || m || dd; };
  const matchesStockPeriod = (dateStr) => { const d = new Date(dateStr); const now = new Date(); if (stockPeriod === 'day') return isSameDay(d, now); if (stockPeriod === 'month') return isSameMonth(d, now); if (stockPeriod === 'year') return isSameYear(d, now); if (stockPeriod === 'all') return true; const y = stockCustomYear ? parseInt(stockCustomYear, 10) : null; const m = stockCustomMonth ? parseInt(stockCustomMonth, 10) : null; const dd = stockCustomDay ? parseInt(stockCustomDay, 10) : null; if (y && d.getFullYear() !== y) return false; if (m && d.getMonth() + 1 !== m) return false; if (dd && d.getDate() !== dd) return false; return y || m || dd; };

  const periodStockByProduct = (() => { const issuedMap = {}; myIssues.filter((i) => matchesStockPeriod(i.issued_at)).forEach((i) => { issuedMap[i.product_id] = (issuedMap[i.product_id] || 0) + i.quantity_issued; }); const soldMap = {}; const cashMap = {}; mySales.filter((s) => matchesStockPeriod(s.created_at)).forEach((s) => { soldMap[s.product_id] = (soldMap[s.product_id] || 0) + s.items_sold; cashMap[s.product_id] = (cashMap[s.product_id] || 0) + Number(s.actual_cash); }); const currentRemainingMap = {}; stockByProduct.forEach((item) => { currentRemainingMap[item.productId] = item.systemRemaining; }); const productIds = new Set([...Object.keys(issuedMap), ...Object.keys(soldMap)]); return Array.from(productIds).map((pid) => ({ productId: pid, name: productName(pid), issued: issuedMap[pid] || 0, sold: soldMap[pid] || 0, cash: cashMap[pid] || 0, currentRemaining: currentRemainingMap[pid] ?? 0 })); })();
  const periodStockTotals = periodStockByProduct.reduce((acc, item) => ({ issued: acc.issued + item.issued, cash: acc.cash + item.cash }), { issued: 0, cash: 0 });
  const currentTotalRemaining = stockByProduct.reduce((sum, item) => sum + item.systemRemaining, 0);

  const periodLabel = () => { if (historyPeriod === 'day') return 'Today'; if (historyPeriod === 'month') return 'This Month'; if (historyPeriod === 'year') return 'This Year'; if (historyPeriod === 'all') return 'All Time'; const parts = []; if (customDay) parts.push(customDay); if (customMonth) parts.push(customMonth); if (customYear) parts.push(customYear); return parts.length ? parts.join('/') : 'Custom'; };

  const filteredHistory = (() => { const now = new Date(); return mySales.filter((s) => { const d = new Date(s.created_at); if (historyPeriod === 'day') return isSameDay(d, now); if (historyPeriod === 'month') return isSameMonth(d, now); if (historyPeriod === 'year') return isSameYear(d, now); if (historyPeriod === 'all') return true; const y = customYear ? parseInt(customYear, 10) : null; const m = customMonth ? parseInt(customMonth, 10) : null; const dd = customDay ? parseInt(customDay, 10) : null; if (y && d.getFullYear() !== y) return false; if (m && d.getMonth() + 1 !== m) return false; if (dd && d.getDate() !== dd) return false; return y || m || dd; }); })();

  const historyTotals = filteredHistory.reduce((acc, s) => ({ sold: acc.sold + s.items_sold, cash: acc.cash + Number(s.actual_cash), commission: acc.commission + Number(s.commission_earned || 0) }), { sold: 0, cash: 0, commission: 0 });

  const buildMyReportHTML = () => { const label = periodLabel(); const rows = filteredHistory.map((s) => `<tr><td>${new Date(s.created_at).toLocaleString()}</td><td>${productName(s.product_id)}</td><td>${s.store_name}</td><td>${s.items_sold}</td><td>GHS ${Number(s.actual_cash).toFixed(2)}</td><td>GHS ${Number(s.commission_earned || 0).toFixed(2)}</td><td>${s.location_label || '—'}</td></tr>`).join(''); return `<html><head><title>${user.name} — ${label} Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;}h1{font-size:18px;margin-bottom:2px;}h2{font-size:13px;font-weight:normal;color:#64748b;margin-top:0;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;}th{background:#f1f5f9;}.totals{margin-top:16px;font-size:13px;font-weight:bold;}</style></head><body><h1>${user.name} — Sales Report</h1><h2>Period: ${label}</h2><table><thead><tr><th>Date/Time</th><th>Product</th><th>Store</th><th>Qty</th><th>Cash</th><th>Commission</th><th>Location</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No sales in this period.</td></tr>'}</tbody></table><div class="totals">Total: ${historyTotals.sold} units · GHS ${historyTotals.cash.toFixed(2)} · Commission GHS ${historyTotals.commission.toFixed(2)}</div></body></html>`; };

  const handlePrintMyReport = async () => { if (Platform.OS !== 'web') { await generateAndSharePDF(buildMyReportHTML(), 'my_sales_report'); return; } const w = window.open('', '_blank'); w.document.write(buildMyReportHTML()); w.document.close(); w.focus(); w.print(); };
  const handleSaveMyPDF = async () => { await generateAndSharePDF(buildMyReportHTML(), `${user.name}_${periodLabel()}_report`); };
  const myReportShareText = `${user.name}'s ${periodLabel()} report:\n${historyTotals.sold} units sold, GHS ${historyTotals.cash.toFixed(2)} collected.`;

  const PeriodTabRow = ({ period, setPeriod }) => ( <View style={styles.periodRow}> {['day', 'month', 'year', 'all', 'custom'].map((p) => ( <TouchableOpacity key={p} style={[styles.periodChip, period === p && styles.periodChipActive]} onPress={() => setPeriod(p)}> <Text style={period === p ? styles.periodTextActive : styles.periodText}>{p === 'day' ? 'Today' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : p === 'all' ? 'All' : 'Custom'}</Text> </TouchableOpacity> ))} </View> );

      const navItems = [ 
    { key: 'ai', label: '✨ AI Assistant', color: C.gold || '#b8860b', onPress: () => setAiAssistantOpen(true) }, 
    { key: 'voicenotes', label: '🎙️ Voice Notes', color: C.green, onPress: () => setVoiceNotesOpen(true) }, 
    { key: 'lessons', label: '📖 Sales Playbook', color: C.green, onPress: () => setLessonsModalOpen(true) }, 
    { key: 'overview', label: '🏠 Overview', color: C.blue, onPress: () => setScreen('overview') }, 
    { key: 'log', label: '🛍️ Log a Sale', color: C.green, onPress: () => openSaleModal(null) }, 
    { key: 'route', label: '📍 My Route', color: C.blue, badge: routes.length ? String(routes.length) : null, onPress: () => setScreen('route') }, 
    { key: 'stock', label: '📦 My Stock', color: C.blue, onPress: () => setScreen('stock') }, 
    { key: 'history', label: '📖 My History', color: C.green, onPress: () => setScreen('history') }, 
    { key: 'corrections', label: '✏️ My Corrections', color: C.blue, badge: pendingEditCount ? String(pendingEditCount) : null, onPress: () => setScreen('corrections') }, 
    { key: 'settings', label: '⚙️ Account Settings', color: C.sub, onPress: () => setPasswordModalOpen(true) }, 
    { key: 'help', label: '❓ How to Use', color: C.sub, onPress: () => setHelpGuideOpen(true) } 
  ];
   const renderOverview = () => {
    const todaySalesCount = mySales.filter((s) => isSameDay(new Date(s.created_at), new Date())).reduce((sum, s) => sum + s.items_sold, 0);
    const todayPacksSold = mySales.filter((s) => isSameDay(new Date(s.created_at), new Date())).reduce((sum, s) => sum + (s.pack_count || 0), 0);
    const stockPacksSummary = (() => { const map = {}; mySales.filter((s) => s.pack_count).forEach((s) => { const name = productName(s.product_id); if (!map[name]) map[name] = { productName: name, totalPacks: 0, totalUnits: 0 }; map[name].totalPacks += s.pack_count; map[name].totalUnits += s.items_sold; }); return Object.values(map); })();
    const allTimeSalesCount = mySales.length;
    const allTimeUnits = mySales.reduce((sum, s) => sum + s.items_sold, 0);
    const allTimeCash = mySales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
    
    return (
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.5 }}>Dashboard</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
            <Text style={{ fontSize: 13, color: C.sub, fontWeight: '600' }}>{locationLabel ? `📍 ${locationLabel}` : 'Fetching location...'}</Text>
            <Text style={{ fontSize: 12, color: C.sub }}>•</Text>
            <Text style={{ fontSize: 12, color: C.sub }}>{syncedAgoText()}</Text>
          </View>
        </View>

        {pendingCount > 0 && <Text style={styles.pendingBanner}>{pendingCount} sale(s) waiting to sync</Text>}
        
        <TouchableOpacity style={[styles.checkInToggle, { backgroundColor: checkedIn ? C.greenTint : C.card, borderColor: C.border }]} onPress={toggleCheckIn}>
          <Text style={[styles.checkInToggleText, { color: checkedIn ? C.green : C.sub }]}>{checkedIn ? '✅ Checked In' : '⏱️ Not Checked In — Tap to Start'}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5 }}>Today's Goal</Text>
          {currentStreak > 1 && (
            <View style={{ backgroundColor: '#ffedd5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#c2410c', fontWeight: '800', fontSize: 12 }}>🔥 {currentStreak} Day Streak</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: C.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12, color: C.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Units Sold</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.ink, marginTop: 8 }}>{todaySalesCount}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12, color: C.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash Collected</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.green, marginTop: 8 }}>GHS {totalCollectedToday.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: C.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>Daily Target</Text>
              <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{todaySalesCount} of {dailyTarget} units</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: todaySalesCount >= dailyTarget ? C.green : C.blue }}>
              {Math.min(Math.round((todaySalesCount / dailyTarget) * 100), 100)}%
            </Text>
          </View>
          <View style={{ height: 12, backgroundColor: C.bg, borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min((todaySalesCount / dailyTarget) * 100, 100)}%`, backgroundColor: todaySalesCount >= dailyTarget ? C.green : C.blue, borderRadius: 6 }} />
          </View>
          {todaySalesCount >= dailyTarget && (
            <Text style={{ textAlign: 'center', fontSize: 13, color: C.green, fontWeight: '800', marginTop: 12 }}>🎯 Target Smashed! Keep going!</Text>
          )}
        </View>

        {/* FORCE SYNC BUTTON */}
        {pendingCount > 0 ? (
          <TouchableOpacity style={{ backgroundColor: C.card, borderWidth: 1, borderColor: '#f59e0b', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 20 }} onPress={async () => {
            setRefreshing(true);
            await fetchAllData();
            setRefreshing(false);
            Alert.alert('Sync Complete', 'Your pending sales have been pushed to the server.');
          }}>
            <Text style={{ color: '#f59e0b', fontSize: 15, fontWeight: '700' }}>🔄 Force Sync ({pendingCount} pending)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 20 }} onPress={async () => {
            setRefreshing(true);
            await fetchAllData();
            setRefreshing(false);
          }}>
            <Text style={{ color: C.sub, fontSize: 15, fontWeight: '700' }}>🔄 Refresh Data</Text>
          </TouchableOpacity>
        )}

        {todayPacksSold > 0 && (
          <Text style={{ textAlign: 'center', fontSize: 13, color: C.blue, fontWeight: '700', marginBottom: 20 }}>
            📦 {todayPacksSold} pack(s) sold today
          </Text>
        )}

        <TouchableOpacity style={{ backgroundColor: '#0b6b43', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12 }} onPress={() => openSaleModal(null)}>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>🛍️ Log a Sale</Text>
        </TouchableOpacity>

        {mySales.length > 0 && (
          <TouchableOpacity style={{ backgroundColor: C.card, borderWidth: 2, borderColor: C.green, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 12 }} onPress={repeatLastSale}>
            <Text style={{ color: C.green, fontSize: 16, fontWeight: '800' }}>🔁 Repeat Last Sale</Text>
                    {/* QUICK SALE TILES */}
        {mySales.length > 0 && (() => {
          // Find the 3 most recent unique product+store combinations
          const uniqueSales = [];
          const seen = new Set();
          for (const sale of mySales) {
            const key = `${sale.product_id}_${sale.store_name}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueSales.push(sale);
            }
            if (uniqueSales.length >= 3) break;
          }

          if (uniqueSales.length === 0) return null;

          return (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: C.sub, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>⚡ Quick Sale (1-Tap)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {uniqueSales.map((sale) => {
                  const prod = products.find(p => p.id === sale.product_id);
                  return (
                    <TouchableOpacity 
                      key={sale.id} 
                      style={{ flex: 1, minWidth: '45%', backgroundColor: C.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border }}
                      onPress={async () => {
                        if (!prod) return Alert.alert('Error', 'Product no longer active');
                        
                        // Pre-fill the sale modal
                        setStoreInput(sale.store_name || '');
                        setLocationInput(locationLabel || '');
                        setPaymentType('cash');
                        setMomoRef('');
                        setLinkedRouteId(null);
                        setSaleItems([{ 
                          product: prod, 
                          itemsSold: String(sale.items_sold), 
                          actualCash: String(sale.actual_cash), 
                          isPack: !!sale.pack_count, 
                          packCount: sale.pack_count ? String(sale.pack_count) : '', 
                          unitsPerPack: sale.units_per_pack ? String(sale.units_per_pack) : '', 
                          leftoverUnits: '' 
                        }]);
                        setSaleModalOpen(true);
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }} numberOfLines={1}>{prod.name}</Text>
                      <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }} numberOfLines={1}>📍 {sale.store_name}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.blue }}>{sale.items_sold} units</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: C.green }}>GHS {Number(sale.actual_cash).toFixed(0)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })()}
          </TouchableOpacity>
        )}

        {managerPhone && (
          <TouchableOpacity style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 20 }} onPress={callManager}>
            <Text style={{ color: C.blue, fontSize: 15, fontWeight: '700' }}>📞 Call My Manager</Text>
          </TouchableOpacity>
        )}

        {stockPacksSummary.length > 0 && (
          <View style={[styles.packSummaryBox, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, marginBottom: 20 }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 12 }}>My All-Time Totals</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: C.bg, padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase' }}>Sales</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 4 }}>{allTimeSalesCount}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.bg, padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase' }}>Units</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 4 }}>{allTimeUnits}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.bg, padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase' }}>Cash</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.green, marginTop: 4 }}>GHS {allTimeCash.toFixed(0)}</Text>
              </View>
            </View>
            {stockPacksSummary.map((p, i) => (
              <Text key={i} style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>• {p.productName}: {p.totalPacks} pack(s) sold ({p.totalUnits} units)</Text>
            ))}
          </View>
        )}

      </ScrollView>
    );
  };

  const renderStock = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.pageTitle}>My Stock</Text>
      <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.green }]} onPress={openCollectModal}>
        <Text style={[styles.secondaryBtnText, { color: C.green }]}>+ Log Items Collected</Text>
      </TouchableOpacity>
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Current Stock</Text>
      {loadingData ? <Text style={styles.emptyText}>Loading...</Text> : stockByProduct.length === 0 ? <Text style={styles.emptyText}>No stock issued to you yet.</Text> : (
        stockByProduct.map((item) => (
          <View key={item.productId} style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 17, color: C.ink }}>{item.name}</Text>
              <View style={{ backgroundColor: item.systemRemaining > 0 ? C.greenTint : '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: item.systemRemaining > 0 ? C.green : '#991b1b' }}>
                  {item.systemRemaining} left
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: C.sub }}>Issued: <Text style={{ fontWeight: '700', color: C.ink }}>{item.issued}</Text></Text>
              <Text style={{ fontSize: 13, color: C.sub }}>Sold: <Text style={{ fontWeight: '700', color: C.ink }}>{item.sold}</Text></Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
              <Text style={{ fontSize: 12, color: C.sub }}>
                {item.countedRemaining != null ? `Last counted: ${item.countedRemaining}` : 'Not yet counted'}
              </Text>
              <TouchableOpacity style={{ backgroundColor: C.blueTint, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }} onPress={() => openCountModal(item)}>
                <Text style={{ color: C.blue, fontWeight: '700', fontSize: 12 }}>Update Count</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Totals by Period</Text>
      <PeriodTabRow period={stockPeriod} setPeriod={setStockPeriod} />
      {stockPeriod === 'custom' && (<View style={styles.customRow}><TextInput style={[styles.input, styles.customInput]} placeholder="Year" keyboardType="numeric" value={stockCustomYear} onChangeText={setStockCustomYear} /><TextInput style={[styles.input, styles.customInput]} placeholder="Month" keyboardType="numeric" value={stockCustomMonth} onChangeText={setStockCustomMonth} /><TextInput style={[styles.input, styles.customInput]} placeholder="Day" keyboardType="numeric" value={stockCustomDay} onChangeText={setStockCustomDay} /></View>)}
      <View style={styles.summaryBox}>
        <Text style={styles.detail}>Issued in period: {periodStockTotals.issued} units · Cash collected: GHS {periodStockTotals.cash.toFixed(2)}</Text>
        <Text style={styles.detail}>Remaining right now: {currentTotalRemaining} units</Text>
      </View>
      {periodStockByProduct.map((item) => (<View key={item.productId} style={styles.row}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.detail}>Issued {item.issued} · Sold {item.sold} · Cash GHS {item.cash.toFixed(2)}</Text></View>))}
    </ScrollView>
  );

  const renderRoute = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.pageTitle}>My Route</Text>
      {routes.length === 0 ? <Text style={styles.emptyText}>No routes assigned yet.</Text> : (
        routes.map((item) => { const isLogged = item.status === 'Checked In'; return (<View key={item.id} style={styles.routeCard}><View><Text style={styles.rowTitle}>{item.store_name}</Text><Text style={styles.detail}>{isLogged ? '✅ Logged' : item.status}</Text></View><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>{!isLogged && (<TouchableOpacity style={styles.checkInBtn} onPress={() => openSaleModal(item)}><Text style={styles.checkInText}>Log Sale</Text></TouchableOpacity>)}<TouchableOpacity onPress={() => { setNotesStore(item.store_name); setNotesModalOpen(true); }}><Text style={styles.linkText}>Notes</Text></TouchableOpacity></View></View>); })
      )}
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.pageTitle}>My History</Text>
      <PeriodTabRow period={historyPeriod} setPeriod={setHistoryPeriod} />
      {historyPeriod === 'custom' && (<View style={styles.customRow}><TextInput style={[styles.input, styles.customInput]} placeholder="Year" keyboardType="numeric" value={customYear} onChangeText={setCustomYear} /><TextInput style={[styles.input, styles.customInput]} placeholder="Month" keyboardType="numeric" value={customMonth} onChangeText={setCustomMonth} /><TextInput style={[styles.input, styles.customInput]} placeholder="Day" keyboardType="numeric" value={customDay} onChangeText={setCustomDay} /></View>)}
      <View style={styles.summaryBox}><Text style={styles.detail}>{periodLabel()} · {filteredHistory.length} sale(s) · {historyTotals.sold} units · GHS {historyTotals.cash.toFixed(2)}</Text></View>
      <ReportActions onPrint={handlePrintMyReport} shareText={myReportShareText} emailSubject={`${user.name} — ${periodLabel()} Report`} />
      <TouchableOpacity style={styles.pdfBtn} onPress={handleSaveMyPDF}><Text style={styles.submitText}>Save PDF</Text></TouchableOpacity>
      {filteredHistory.length === 0 ? <Text style={styles.emptyText}>No sales in this period.</Text> : (
             filteredHistory.map((s) => (
          <View key={s.id} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
            
            {/* TOP ROW: Product & Cash */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>📦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }} numberOfLines={1}>
                    {productName(s.product_id)}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                    {s.items_sold} units sold {s.pack_count ? `(${s.pack_count} packs)` : ''}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.green }}>
                + GHS {Number(s.actual_cash).toFixed(2)}
              </Text>
            </View>

            {/* DIVIDER */}
            <View style={{ height: 1, backgroundColor: C.border, marginVertical: 12 }} />

            {/* BOTTOM ROW: Details & Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: s.payment_type === 'momo' ? '#eff6ff' : C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: s.payment_type === 'momo' ? '#2563eb' : C.sub }}>
                    {s.payment_type === 'momo' ? '📱 MoMo' : '💵 Cash'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: C.sub }}>
                  📍 {s.store_name}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 12, color: C.sub }}>
                  {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <TouchableOpacity onPress={() => openEditRequest(s)} style={{ backgroundColor: C.blueTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

    const renderCorrections = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.pageTitle}>My Corrections</Text>
      <PeriodTabRow period={correctionPeriod} setPeriod={setCorrectionPeriod} />
      {correctionPeriod === 'custom' && (<View style={styles.customRow}><TextInput style={[styles.input, styles.customInput]} placeholder="Year" keyboardType="numeric" value={correctionCustomYear} onChangeText={setCorrectionCustomYear} /><TextInput style={[styles.input, styles.customInput]} placeholder="Month" keyboardType="numeric" value={correctionCustomMonth} onChangeText={setCorrectionCustomMonth} /><TextInput style={[styles.input, styles.customInput]} placeholder="Day" keyboardType="numeric" value={correctionCustomDay} onChangeText={setCorrectionCustomDay} /></View>)}
      
      {myEditRequests.filter((r) => matchesCorrectionPeriod(r.created_at)).length === 0 ? (
        <Text style={styles.emptyText}>No correction requests in this period.</Text>
      ) : (
        myEditRequests.filter((r) => matchesCorrectionPeriod(r.created_at)).map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.rowTitle, { flexShrink: 1 }]} numberOfLines={1}>
                Requested: {r.new_items_sold} sold, GHS {Number(r.new_actual_cash).toFixed(2)}
              </Text>
              <Text style={[styles.statusBadge, r.status === 'approved' ? styles.statusApproved : r.status === 'rejected' ? styles.statusRejected : styles.statusPending]}>
                {r.status}
              </Text>
            </View>
            <Text style={styles.reasonText}>"{r.reason}"</Text>
            <Text style={styles.detail}>{new Date(r.created_at).toLocaleString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const modals = (
    <>
        <Modal visible={saleModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalBox, { maxWidth: 500, width: '95%', maxHeight: '90%', padding: 0, overflow: 'hidden' }]}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{t('log_sale_title')}</Text>
              <TouchableOpacity onPress={() => setSaleModalOpen(false)} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
            <Text style={styles.label}>{t('store_customer_name')}</Text>
            <TextInput style={styles.input} value={storeInput} onChangeText={setStoreInput} placeholder="e.g. Kejetia Market Stall 4" placeholderTextColor="#64748b" />
            <Text style={styles.label}>{t('location_label')}</Text>
            <TextInput style={styles.input} value={locationInput} onChangeText={setLocationInput} placeholder="Town, area, or landmark" placeholderTextColor="#64748b" />
            <TouchableOpacity onPress={requestLocation} disabled={locatingNow}><Text style={styles.useLocationText}>{locatingNow ? 'Locating...' : t('use_current_location')}</Text></TouchableOpacity>
            <Text style={[styles.label, { marginTop: 12 }]}>{t('how_paid')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setPaymentType('cash')} style={[styles.paymentChip, paymentType === 'cash' && styles.paymentChipActive]}><Text style={paymentType === 'cash' ? styles.paymentChipTextActive : styles.paymentChipText}>💵 {t('cash')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setPaymentType('momo')} style={[styles.paymentChip, paymentType === 'momo' && styles.paymentChipActive]}><Text style={paymentType === 'momo' ? styles.paymentChipTextActive : styles.paymentChipText}>📱 {t('momo')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setPaymentType('credit')} style={[styles.paymentChip, paymentType === 'credit' && styles.paymentChipActive]}><Text style={paymentType === 'credit' ? styles.paymentChipTextActive : styles.paymentChipText}>🧾 {t('credit')}</Text></TouchableOpacity>
            </View>
            {paymentType === 'credit' && (<Text style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>Goods given, payment still owed.</Text>)}
            {paymentType === 'momo' && (<TextInput style={styles.input} value={momoRef} onChangeText={setMomoRef} placeholder="MoMo transaction ref (optional)" placeholderTextColor="#64748b" />)}
            <Text style={[styles.label, { marginTop: 12 }]}>{t('items_sold_today')}</Text>
            <KeyboardAwareScrollView style={{ maxHeight: 280 }} enableOnAndroid extraScrollHeight={80}>
              {saleItems.map((item, index) => (
                <View key={index} style={styles.saleItemBlock}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={styles.saleItemLabel}>{t('item_n')(index + 1)}</Text>{saleItems.length > 1 && <TouchableOpacity onPress={() => removeSaleItemLine(index)}><Text style={styles.removeItemText}>{t('remove')}</Text></TouchableOpacity>}</View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipRow, { flex: 1 }]}>{products.map((p) => (<TouchableOpacity key={p.id} style={[styles.chip, item.product?.id === p.id && styles.chipActive]} onPress={() => updateSaleItem(index, 'product', p)}><Text style={item.product?.id === p.id ? styles.chipTextActive : styles.chipText}>{p.name}</Text></TouchableOpacity>))}</ScrollView>
                    <TouchableOpacity onPress={() => { setScanTarget({ type: 'saleItem', index }); setScannerOpen(true); }} style={styles.scanBtn}><Text style={styles.scanBtnText}>📷</Text></TouchableOpacity>
                  </View>
                  {item.product && <Text style={styles.priceHint}>GHS {item.product.unit_price} each · {(item.product.commission_rate * 100).toFixed(0)}% commission</Text>}
                  <Text style={styles.label}>Items sold</Text>
                  <TouchableOpacity onPress={() => updateSaleItem(index, 'isPack', !item.isPack)} style={styles.packToggle}><Text style={styles.packToggleText}>{item.isPack ? '☑' : '☐'} {t('sold_as_packs')}</Text></TouchableOpacity>
                  {item.isPack ? (<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} keyboardType="numeric" value={item.packCount} onChangeText={(v) => updateSaleItem(index, 'packCount', v)} placeholder={t('full_packs')} placeholderTextColor="#64748b" /><TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} keyboardType="numeric" value={item.unitsPerPack} onChangeText={(v) => updateSaleItem(index, 'unitsPerPack', v)} placeholder={t('units_per_pack')} placeholderTextColor="#64748b" /><TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} keyboardType="numeric" value={item.leftoverUnits} onChangeText={(v) => updateSaleItem(index, 'leftoverUnits', v)} placeholder={t('leftover_units')} placeholderTextColor="#64748b" /></View>) : null}
                  <TextInput style={styles.input} keyboardType="numeric" value={item.itemsSold} onChangeText={(v) => updateSaleItem(index, 'itemsSold', v)} placeholder={item.isPack ? 'Total units (auto-filled)' : '0'} placeholderTextColor="#64748b" />
                  <Text style={styles.label}>{t('cash_collected')}</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={item.actualCash} onChangeText={(v) => updateSaleItem(index, 'actualCash', v)} placeholder="0.00" placeholderTextColor="#64748b" />
                </View>
              ))}
            </KeyboardAwareScrollView>
                 <TouchableOpacity onPress={addSaleItemLine} style={[styles.addItemBtn, { marginTop: 16 }]}><Text style={styles.addItemBtnText}>{t('add_another_item')}</Text></TouchableOpacity>
            
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#0b6b43', paddingVertical: 16, borderRadius: 12, marginTop: 20 }]} onPress={submitSale}>
              <Text style={[styles.submitText, { fontSize: 18 }]}>{t('submit')}</Text>
            </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity onPress={() => setSaleModalOpen(false)} style={{ marginTop: 16, alignItems: 'center', paddingBottom: 20 }}>
              <Text style={[styles.cancelText, { fontSize: 15, fontWeight: '600' }]}>{t('cancel')}</Text>
            </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!countModalProduct} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Remaining — {countModalProduct?.name}</Text>
            <Text style={styles.label}>Actual remaining items</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={countInput} onChangeText={setCountInput} placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.priceHint}>System calculates {countModalProduct?.systemRemaining} remaining.</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={submitCount}><Text style={styles.submitText}>Save Count</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setCountModalProduct(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={collectModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Log Items Collected</Text>
            <Text style={styles.label}>Product</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipRow, { flex: 1 }]}>{products.map((p) => (<TouchableOpacity key={p.id} style={[styles.chip, collectProduct?.id === p.id && styles.chipActive]} onPress={() => setCollectProduct(p)}><Text style={collectProduct?.id === p.id ? styles.chipTextActive : styles.chipText}>{p.name}</Text></TouchableOpacity>))}</ScrollView>
              <TouchableOpacity onPress={() => { setScanTarget({ type: 'collect' }); setScannerOpen(true); }} style={styles.scanBtn}><Text style={styles.scanBtnText}>📷</Text></TouchableOpacity>
            </View>
            <Text style={styles.label}>Quantity collected</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={collectQty} onChangeText={setCollectQty} placeholder="0" placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitBtn} onPress={submitCollected}><Text style={styles.submitText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setCollectModalOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!editingSale} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Request Edit</Text>
            <Text style={styles.label}>New items sold</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={newItemsSold} onChangeText={setNewItemsSold} placeholderTextColor="#64748b" />
            <Text style={styles.label}>New cash collected (GHS)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={newActualCash} onChangeText={setNewActualCash} placeholderTextColor="#64748b" />
            <Text style={styles.label}>Reason for this change</Text>
            <View style={styles.reasonChipWrap}>{editReasonOptions.map((option) => (<TouchableOpacity key={option} style={[styles.reasonChip, selectedReasonChip === option && styles.reasonChipActive]} onPress={() => selectReasonChip(option)}><Text style={selectedReasonChip === option ? styles.reasonChipTextActive : styles.reasonChipText}>{option}</Text></TouchableOpacity>))}</View>
            {selectedReasonChip === 'Other' && (<TextInput style={[styles.input, { height: 70, marginTop: 8 }]} multiline value={editReason} onChangeText={setEditReason} placeholder="Type the reason..." placeholderTextColor="#64748b" />)}
            <TouchableOpacity style={styles.submitBtn} onPress={submitEditRequest}><Text style={styles.submitText}>Send Request</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingSale(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomerNoteModal visible={notesModalOpen} storeName={notesStore} userId={user.id} onClose={() => setNotesModalOpen(false)} />
      <AccountSettingsModal visible={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} currentPhone={user.phone} onUpdated={onLogout} />
      <BarcodeScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} products={products} onScanned={(product) => { if (scanTarget?.type === 'saleItem') updateSaleItem(scanTarget.index, 'product', product); else if (scanTarget?.type === 'collect') setCollectProduct(product); }} />
      <HelpGuideModal visible={helpGuideOpen} onClose={() => setHelpGuideOpen(false)} role="agent" />
         <AISupportModal 
  visible={aiAssistantOpen} 
  onClose={() => setAiAssistantOpen(false)} 
  role="agent" 
  userId={user.id} 
/>
    </>
  );

    return (
    <View style={styles.appRow}>
      
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 60, marginBottom: 10 }}>🎉</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0b6b43', textAlign: 'center', marginBottom: 10 }}>Target Smashed!</Text>
            <Text style={{ fontSize: 16, color: '#334155', textAlign: 'center', marginBottom: 24 }}>
              Congratulations! You just hit your daily goal of {dailyTarget} units. Keep up the amazing work!
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#0b6b43', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, width: '100%', alignItems: 'center' }}
              onPress={() => setShowCelebration(false)}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Awesome! 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

        <Sidebar currentScreen={screen} setScreen={setScreen} navItems={navItems} user={user} onLogout={onLogout} />
      <DailyChecklistModal userId={user.id} />
      <LessonsModal visible={lessonsModalOpen} onClose={() => setLessonsModalOpen(false)} />
      <View style={styles.contentArea}>
        <VoiceNoteModal visible={voiceNotesOpen} onClose={() => { setVoiceNotesOpen(false); if (returnToSale) { setSaleModalOpen(true); setReturnToSale(false); } }} userId={user.id} isManager={false} productNames={products.map((p) => p.name)} onUseInLogSale={(transcript) => { openSaleModalFromVoice(transcript); setVoiceNotesOpen(false); }} />
        {screen === 'overview' && renderOverview()}
        
        {screen === 'stock' && renderStock()}
        {screen === 'route' && renderRoute()}
        {screen === 'history' && renderHistory()}
        {screen === 'corrections' && renderCorrections()}
      </View>
      {modals}
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  packSummaryBox: { backgroundColor: '#fdf7e6', borderRadius: 10, padding: 14, marginBottom: 12 },
  packToggle: { paddingVertical: 6 },
  packToggleText: { fontSize: 13, color: '#0b6b43', fontWeight: '600' },
  checkInToggle: { backgroundColor: '#eafbf3', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  checkInToggleText: { fontSize: 17, fontWeight: '700', color: '#1a1f26' },
  reasonChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  reasonChip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.white },
  reasonChipActive: { backgroundColor: C.blue, borderColor: C.blue },
  reasonChipText: { color: C.sub, fontSize: 14, fontWeight: '600' },
  reasonChipTextActive: { color: C.white, fontSize: 14, fontWeight: '600' },
  bigNumberBox: { backgroundColor: C.blueTint, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  bigNumberEmoji: { fontSize: 40, marginBottom: 6 },
  bigNumberText: { fontSize: 22, fontWeight: '800', color: C.ink },
  bigNumberSub: { fontSize: 16, color: C.blue, fontWeight: '700', marginTop: 4 },
  lowStockBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 14, marginBottom: 16 },
  lowStockText: { fontSize: 18, color: '#991b1b', fontWeight: '600', marginBottom: 2 },
  repeatBtn: { backgroundColor: C.greenTint, borderWidth: 1, borderColor: C.green, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  repeatBtnText: { color: C.green, fontWeight: '800', fontSize: 17 },
  callBtn: { backgroundColor: C.white, borderWidth: 2, borderColor: C.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  callBtnText: { color: C.blue, fontWeight: '800', fontSize: 17 },
  appRow: { flex: 1, flexDirection: 'row', backgroundColor: C.white },
  contentArea: { flex: 1, paddingTop: 56 },
  list: { flex: 1, padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 10 },
  locationText: { fontSize: 13, color: C.sub, marginBottom: 10 },
  pendingBanner: { fontSize: 15, color: '#92400e', backgroundColor: '#fef3c7', padding: 8, borderRadius: 8, marginBottom: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiLabel: { fontSize: 11, color: C.sub },
  kpiValue: { fontSize: 18, fontWeight: '800', marginTop: 4, color: C.ink },
  bigLogBtn: { backgroundColor: C.blue, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  bigLogBtnText: { color: C.white, fontWeight: '700', fontSize: 19 },
  secondaryBtn: { backgroundColor: C.greenTint, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryBtnText: { color: C.green, fontWeight: '700', fontSize: 13 },
  emptyText: { color: C.sub, textAlign: 'center', marginTop: 10, marginBottom: 10 },
  row: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 12, marginBottom: 10 },
  routeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 12, marginBottom: 10 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 12, marginBottom: 10 },
  rowTitle: { fontWeight: '700', color: C.ink, fontSize: 16 },
  detail: { fontSize: 14, color: C.sub, marginTop: 2 },
  checkInBtn: { backgroundColor: C.blue, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  checkInText: { color: C.white, fontWeight: '600', fontSize: 13 },
  editBtn: { backgroundColor: C.blueTint, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  editBtnText: { color: C.blue, fontWeight: '600', fontSize: 12 },
  reasonText: { fontSize: 12, color: C.ink, fontStyle: 'italic', marginTop: 4 },
  statusBadge: { fontSize: 19, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, overflow: 'hidden', textTransform: 'capitalize' },
  statusPending: { backgroundColor: '#fef3c7', color: '#92400e' },
  statusApproved: { backgroundColor: C.greenTint, color: C.green },
  statusRejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
  countBtn: { backgroundColor: C.blueTint, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  countBtnText: { color: C.blue, fontWeight: '600', fontSize: 11 },
  pdfBtn: { backgroundColor: C.green, padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 14 },
  saleItemBlock: { backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  saleItemLabel: { fontSize: 12, fontWeight: '700', color: C.ink },
  removeItemText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  addItemBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  addItemBtnText: { color: C.blue, fontWeight: '600', fontSize: 13 },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: C.ink },
  label: { fontSize: 15, color: C.sub, marginBottom: 4, marginTop: 8 },
  useLocationText: { color: C.blue, fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, backgroundColor: C.white },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { color: C.sub, fontSize: 15 },
  chipTextActive: { color: C.white, fontSize: 15, fontWeight: '600' },
  priceHint: { fontSize: 12, color: C.sub, marginTop: 4, marginBottom: 4 },
  scanBtn: { backgroundColor: '#eafbf3', borderRadius: 10, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  scanBtnText: { fontSize: 20 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  periodChip: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.white },
  periodChipActive: { backgroundColor: C.blue, borderColor: C.blue },
  periodText: { color: C.sub, fontSize: 14 },
  periodTextActive: { color: C.white, fontSize: 11, fontWeight: '600' },
  customRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  customInput: { flex: 1 },
  summaryBox: { backgroundColor: C.blueTint, padding: 10, borderRadius: 10, marginBottom: 10 },
  input: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 10, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#000000', 
    placeholderTextColor: '#64748b' 
  },
  submitBtn: { backgroundColor: C.blue, padding: 14, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  submitText: { color: C.white, fontWeight: 'bold', fontSize: 18 },
  cancelText: { textAlign: 'center', color: C.text, fontWeight: '600', marginTop: 12 },
  paymentChip: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  paymentChipActive: { backgroundColor: '#0b6b43', borderColor: '#0b6b43' },
  paymentChipText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  paymentChipTextActive: { fontSize: 14, fontWeight: '600', color: '#fff' },
    // 📱 Responsive fixes
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { 
    width: Platform.OS === 'web' ? '47%' : '100%',  // Full width on phone
    backgroundColor: C.white, 
    padding: 16, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: C.border 
  },
  barLabel: { 
    width: Platform.OS === 'web' ? 90 : 70,  // Smaller label on phone
    fontSize: Platform.OS === 'web' ? 18 : 14, 
    color: C.ink, 
    fontWeight: '600' 
  },
  barValue: { 
    width: Platform.OS === 'web' ? 80 : 60, 
    fontSize: 11, 
    color: C.sub, 
    textAlign: 'right' 
  },
  modalContent: { 
    width: '100%', 
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    backgroundColor: C.card, 
    borderRadius: 12, 
    padding: Platform.OS === 'web' ? 20 : 14, 
    borderWidth: 1, 
    borderColor: C.border 
  },
  linkText: { color: C.blue, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});