import { Linking, Platform } from 'react-native';

export const shareToWhatsApp = (text) => {
  const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
  Linking.canOpenURL(url).then((supported) => {
    if (supported) Linking.openURL(url);
    else Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  });
};

export const shareToEmail = (subject, text) => {
  Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`);
};

export const shareToSMS = (text) => {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  Linking.openURL(`sms:${separator}body=${encodeURIComponent(text)}`);
};