import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

const C = { blue: '#0b6b43', gold: '#b8860b', ink: '#1a1f26', sub: '#6b7280', white: '#ffffff', border: '#e5e5df' };

const LESSONS = [
  {
    title: '1. First Impressions & Approach',
    points: [
      'Smile before you speak — people decide if they trust you in the first 3 seconds.',
      'Greet by name if you know it, or with warmth if you don\'t: "Good afternoon, how is business today?"',
      'Never start with the product. Start with the person — ask how their day is going.',
      'Stand at a comfortable distance, not too close. Respect their space, especially in a shop.',
      'Dress neatly and carry your products cleanly — people judge quality by how you present yourself.',
    ],
  },
  {
    title: '2. Building Rapport Fast',
    points: [
      'Find one small thing in common — their shop, their town, something they\'re doing.',
      'Listen more than you talk in the first minute. Let them tell you what they need.',
      'Use their name often — it builds trust and makes the conversation personal.',
      'Compliment genuinely — never fake it. People can tell.',
      'Remember details from past visits (use the Notes feature!) — "Last time you said your husband liked the tonic, how is he?"',
    ],
  },
  {
    title: '3. Presenting the Product',
    points: [
      'Lead with the benefit, not the ingredient list — "This helps with digestion and energy" beats reciting every herb.',
      'Keep it short. Two or three strong points beat ten weak ones.',
      'Use real stories: "A customer near Kejetia told me it helped her sleep better within a week."',
      'Let them hold or look at the product — physical touch increases buying interest.',
      'Match your energy to theirs — calm customer, calm pitch; excited customer, more energy.',
    ],
  },
  {
    title: '4. Handling "No" and Objections',
    points: [
      '"No" often means "not yet" — ask what\'s holding them back instead of walking away immediately.',
      'If price is the issue, don\'t argue — explain value: "It\'s GHS X but one pack lasts a month."',
      'If they say "let me think about it," ask one clarifying question: "Is it the price, or do you want to know more first?"',
      'Never argue or get defensive. Stay calm, respectful, and patient — it protects the relationship for next time.',
      'If it\'s truly a no, thank them warmly and leave the door open: "No problem, I\'ll check on you next time I\'m around."',
    ],
  },
  {
    title: '5. Closing the Sale',
    points: [
      'Ask directly once interest is clear: "Should I get you one, or would two be better?"',
      'Offer a simple choice, not an open question — "One or two?" is easier to answer than "How many do you want?"',
      'If they hesitate, summarize the benefit one more time, then go quiet — let them decide.',
      'Always thank them by name after the sale, even for a small purchase.',
      'Confirm they know how to use the product properly before you leave.',
    ],
  },
  {
    title: '6. Communication & Manners',
    points: [
      'Speak clearly and at a comfortable pace — don\'t rush your words.',
      'Use respectful greetings appropriate to the person\'s age and standing in the community.',
      'Never interrupt a customer mid-sentence, even if you\'re excited to respond.',
      'If a customer is upset or frustrated, lower your voice and stay calm — it defuses tension.',
      'Always say thank you, whether they buy or not — your reputation travels faster than your product.',
    ],
  },
  {
    title: '7. Follow-Up & Repeat Business',
    points: [
      'A first sale is the start, not the end. Note when they might need more (weekly, monthly).',
      'Check in even when you\'re not selling — "Just passing by, how are you finding the product?"',
      'Ask happy customers if they know anyone else who might benefit — referrals are the fastest growth.',
      'Keep your word. If you promise to return on a certain day, show up.',
      'Consistency builds trust — the agents who visit reliably outsell the ones who only show up once.',
    ],
  },
];

export default function LessonsModal({ visible, onClose }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>📖 Sales & Marketing Playbook</Text>
          <Text style={styles.subtitle}>Practical lessons for selling well and building trust.</Text>

          <ScrollView style={{ maxHeight: 450 }}>
            {LESSONS.map((lesson, i) => (
              <View key={i} style={styles.lessonBlock}>
                <TouchableOpacity onPress={() => setOpenIndex(openIndex === i ? -1 : i)} style={styles.lessonHeader}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.chevron}>{openIndex === i ? '▾' : '▸'}</Text>
                </TouchableOpacity>
                {openIndex === i && (
                  <View style={styles.lessonBody}>
                    {lesson.points.map((point, j) => (
                      <View key={j} style={styles.pointRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.sub, marginBottom: 14 },
  lessonBlock: { borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 6 },
  lessonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  lessonTitle: { fontSize: 15, fontWeight: '700', color: C.ink, flex: 1 },
  chevron: { fontSize: 16, color: C.gold, marginLeft: 8 },
  lessonBody: { paddingBottom: 12 },
  pointRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 8 },
  bullet: { color: C.gold, fontSize: 16, marginRight: 8, lineHeight: 20 },
  pointText: { flex: 1, fontSize: 14, color: C.ink, lineHeight: 20 },
  closeBtn: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  closeBtnText: { color: C.ink, fontWeight: '700', fontSize: 15 },
});