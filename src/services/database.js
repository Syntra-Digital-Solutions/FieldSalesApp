import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@pending_sales_queue';

export const saveSaleOffline = async (saleData) => {
  try {
    const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];

    const newEntry = {
      ...saleData,
      local_id: Date.now().toString(),
      synced: false,
      timestamp: new Date().toISOString(),
    };

    queue.push(newEntry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return { success: true, entry: newEntry };
  } catch (error) {
    console.error('Local save error:', error);
    return { success: false, error };
  }
};

export const getQueuedSales = async () => {
  try {
    const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
    return existingQueue ? JSON.parse(existingQueue) : [];
  } catch (error) {
    console.error('Local read error:', error);
    return [];
  }
};

export const getPendingCount = async () => {
  const queue = await getQueuedSales();
  return queue.filter((item) => !item.synced).length;
};

// Removes entries whose local_id is in syncedLocalIds — called once a batch
// upload to Supabase is confirmed successful, so the local queue never grows
// unbounded on the device.
export const clearSyncedSales = async (syncedLocalIds) => {
  try {
    const queue = await getQueuedSales();
    const remaining = queue.filter((item) => !syncedLocalIds.includes(item.local_id));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return { success: true, removedCount: queue.length - remaining.length };
  } catch (error) {
    console.error('Queue trim error:', error);
    return { success: false, error };
  }
};