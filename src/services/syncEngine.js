import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabaseClient';
import { getQueuedSales, clearSyncedSales } from './database';

let unsubscribe = null;

export const initSyncEngine = (onSyncComplete) => {
  // Try to sync immediately in case we already have internet on boot
  processOfflineQueue(onSyncComplete);

  if (unsubscribe) return; // avoid double-subscribing
  
  unsubscribe = NetInfo.addEventListener((state) => {
    // Only trigger if we are truly online
    if (state.isConnected && state.isInternetReachable) {
      processOfflineQueue(onSyncComplete);
    }
  });
};

export const stopSyncEngine = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};

export const processOfflineQueue = async (onSyncComplete) => {
  try {
    const queue = await getQueuedSales();
    const unsynced = queue.filter((item) => !item.synced);
    
    if (unsynced.length === 0) return;

    // Strip local-only fields before sending to Supabase, but remember
    // each row's local_id so we know exactly what to clear afterward.
    const localIds = unsynced.map((item) => item.local_id);
    const payload = unsynced.map(({ local_id, synced, timestamp, ...rest }) => rest);

    const { error, status } = await supabase.from('sales').insert(payload);

    // Only trim the local queue if Supabase confirms the whole batch landed
    if (!error && (status === 201 || status === 200)) {
      await clearSyncedSales(localIds);
      if (onSyncComplete) onSyncComplete(unsynced.length);
    } else if (error) {
      console.error('Batch sync failed:', error.message);
    }
  } catch (error) {
    // Silently ignore network errors when offline
    if (!error.message.includes('Failed to fetch')) {
      console.error('Sync engine error:', error);
    }
  }
};