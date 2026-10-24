import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { supabase } from '../src/config/supabaseClient';

const C = { blue: '#0b6b43', green: '#b8860b', ink: '#1a1f26', sub: '#6b7280', border: '#e5e5df', white: '#ffffff' };

export default function TrainingQuizModal({ visible, userId, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (visible) {
      (async () => {
        const { data } = await supabase.from('training_questions').select('*');
        setQuestions(data || []);
        setAnswers({});
        setSubmitted(false);
      })();
    }
  }, [visible]);

  const selectAnswer = (qId, option) => setAnswers((prev) => ({ ...prev, [qId]: option }));

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert('Incomplete', 'Answer every question before submitting.');
      return;
    }
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct_option) correct++; });
    setScore(correct);
    setSubmitted(true);
    await supabase.from('training_results').insert([{ agent_id: userId, score: correct, total: questions.length }]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>📘 Training Quiz</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {submitted ? (
              <Text style={styles.resultText}>You scored {score} out of {questions.length}!</Text>
            ) : (
              questions.map((q) => (
                <View key={q.id} style={styles.qBlock}>
                  <Text style={styles.qText}>{q.question}</Text>
                  {['a', 'b', 'c'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.option, answers[q.id] === opt && styles.optionActive]}
                      onPress={() => selectAnswer(q.id, opt)}
                    >
                      <Text style={answers[q.id] === opt ? styles.optionTextActive : styles.optionText}>
                        {q[`option_${opt}`]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
          {!submitted && (
            <TouchableOpacity style={styles.submitBtn} onPress={submitQuiz}>
              <Text style={styles.submitText}>Submit Answers</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}><Text style={styles.close}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 14 },
  qBlock: { marginBottom: 18 },
  qText: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 8 },
    option: { borderWidth: 1.5, borderColor: C.border, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 8 },
  optionActive: { backgroundColor: C.blue, borderColor: C.blue },
  optionText: { color: C.ink, fontSize: 14 },
  optionTextActive: { color: C.white, fontSize: 14, fontWeight: '600' },
  submitBtn: { backgroundColor: C.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: C.white, fontWeight: '800', fontSize: 16 },
  resultText: { fontSize: 18, fontWeight: '800', color: C.ink, textAlign: 'center', marginVertical: 20 },
  close: { textAlign: 'center', color: C.sub, fontSize: 15 },
});