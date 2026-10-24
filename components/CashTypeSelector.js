import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

export default function CashTypeSelector({ onPaymentChange }) {
  const [paymentType, setPaymentType] = useState('Cash'); // 'Cash', 'Mobile Money', 'Split'
  const [cashAmount, setCashAmount] = useState('');
  const [momoAmount, setMomoAmount] = useState('');

  const handleTypeSelect = (type) => {
    setPaymentType(type);
    if (type !== 'Split') {
      onPaymentChange({ method: type, cash: 0, momo: 0 });
    }
  };

  const handleSplitChange = (cash, momo) => {
    setCashAmount(cash);
    setMomoAmount(momo);
    onPaymentChange({
      method: 'Split',
      cash: parseFloat(cash) || 0,
      momo: parseFloat(momo) || 0,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Payment Method</Text>

      {/* Selector Buttons */}
      <View style={styles.buttonGroup}>
        {['Cash', 'Mobile Money', 'Split'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              paymentType === type && styles.selectedButton,
            ]}
            onPress={() => handleTypeSelect(type)}
          >
            <Text
              style={[
                styles.buttonText,
                paymentType === type && styles.selectedButtonText,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inputs for Split Payment */}
      {paymentType === 'Split' && (
        <View style={styles.splitInputsContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.subLabel}>Cash Paid (GH₵)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              value={cashAmount}
              onChangeText={(val) => handleSplitChange(val, momoAmount)}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.subLabel}>MoMo Paid (GH₵)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              value={momoAmount}
              onChangeText={(val) => handleSplitChange(cashAmount, val)}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  selectedButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  selectedButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  splitInputsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
  },
});