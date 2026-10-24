import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

export const generateAndSharePDF = async (html, filename = 'report') => {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'web') {
      window.open(uri, '_blank');
      return uri;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Alert.alert('PDF Saved', `Saved to: ${uri}`);
    }
    return uri;
  } catch (e) {
    Alert.alert('Error', 'Could not generate PDF: ' + e.message);
    return null;
  }
};