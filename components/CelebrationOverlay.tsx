// components/CelebrationOverlay.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const NEON_GREEN = '#ADFF2F';
const DARK_GREY = '#1E1E1E';

interface CelebrationOverlayProps {
  visible: boolean;
  percentage: number;
  message: string;
  onClose: () => void;
}

// Emoji confetti component
const EmojiRain = () => {
  const emojis = ['🔥', '💪', '🎉'];
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: Math.random() * width,
    delay: Math.random() * 2000,
    duration: 3000 + Math.random() * 2000,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle) => (
        <FallingEmoji key={particle.id} {...particle} />
      ))}
    </View>
  );
};

const FallingEmoji = ({ emoji, x, delay, duration }: any) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.emoji,
        {
          left: x,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

export default function CelebrationOverlay({ visible, percentage, message, onClose }: CelebrationOverlayProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
        <EmojiRain />

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Milestone Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{percentage}%</Text>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Feather
              name={percentage === 100 ? 'award' : 'zap'}
              size={64}
              color={NEON_GREEN}
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 }}
            />
          </View>

          {/* Message */}
          <Text style={styles.title}>
            {percentage === 100 ? 'Goal Smashed!' : 'Keep Going🔥'}
          </Text>
          <Text style={styles.message}>{message}</Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${percentage}%` }]} />
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Let's Go! 💪</Text>
          </TouchableOpacity>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    position: 'absolute',
    fontSize: 32,
  },
  contentContainer: {
    width: width * 0.85,
    padding: 32,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: NEON_GREEN,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  badgeText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  message: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBar: {
    height: '100%',
    backgroundColor: NEON_GREEN,
  },
  button: {
    backgroundColor: NEON_GREEN,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
