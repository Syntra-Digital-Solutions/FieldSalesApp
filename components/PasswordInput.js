import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

const C = { border: '#e5e5df', ink: '#1a1f26', sub: '#6b7280' };

export default function PasswordInput({ value, onChangeText, placeholder, style }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.sub}
        secureTextEntry={!visible}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={() => setVisible((v) => !v)} style={styles.eyeBtn}>
        <Text style={styles.eyeText}>{visible ? '👁' : '⊘'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10 },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 17, color: C.ink },
  eyeBtn: { paddingHorizontal: 12 },
  eyeText: { fontSize: 18, color: C.ink },
});