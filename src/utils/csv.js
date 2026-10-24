import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

export const generateAndShareCSV = async (csvString, filename = 'export') => {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
    const fileUri = FileSystem.documentDirectory + `${filename}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
    } else {
      Alert.alert('CSV Saved', `Saved to: ${fileUri}`);
    }
    return true;
  } catch (e) {
    Alert.alert('Error', 'Could not export CSV: ' + e.message);
    return false;
  }
};