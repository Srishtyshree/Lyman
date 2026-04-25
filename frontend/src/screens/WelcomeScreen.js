import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from './WelcomeScreen.styles';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

const { width, height } = Dimensions.get('window');

export const WelcomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [isSwiped, setIsSwiped] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const swipeWidth = Math.min(width - 64, 400) - 16; // Container width minus padding
  const handleWidth = 48;
  const maxTravel = swipeWidth - handleWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx < maxTravel) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        } else if (gestureState.dx >= maxTravel) {
          pan.setValue({ x: maxTravel, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > maxTravel * 0.7) {
          // Swipe completed
          setIsSwiped(true);
          Animated.spring(pan, {
            toValue: { x: maxTravel, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            navigation.navigate('Auth');
            // Reset state slightly after navigation so it's ready if they go back
            setTimeout(() => {
              setIsSwiped(false);
              pan.setValue({ x: 0, y: 0 });
            }, 500);
          });
        } else {
          // Reset
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Background Gradient Animation setup
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(bgAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bgAnim]);

  // Interpolate the animation value to shift the giant background view
  const translateX = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  });
  
  const translateY = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height / 2],
  });

  const handleColor = pan.x.interpolate({
    inputRange: [0, maxTravel],
    outputRange: ['#ffffff', '#D97B47']
  });

  const iconOrangeOpacity = pan.x.interpolate({
    inputRange: [0, maxTravel],
    outputRange: [1, 0]
  });

  const iconWhiteOpacity = pan.x.interpolate({
    inputRange: [0, maxTravel],
    outputRange: [0, 1]
  });

  if (!fontsLoaded) {
    return null; // Return null or a loading indicator while fonts load
  }

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      {/* Animated Gradient Background */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: width * 3,
          height: height * 3,
          transform: [{ translateX }, { translateY }]
        }}
      >
        <LinearGradient
          // Using brighter, more vivid colors for the background gradient
          colors={['#FFFFFF', '#FFF5F0', '#FFD1B3', '#FFF1EB', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <View style={styles.gradientContainer}>
        {/* Header Logo Area */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Layman</Text>
        </View>

        {/* Main Content Canvas */}
        <View style={styles.mainCanvas}>
          <Text style={styles.headline}>
            Business,{'\n'}tech & startups{'\n'}
            <Text style={styles.highlightText}>made simple</Text>
          </Text>
        </View>

        {/* Footer Action Area */}
        <View style={styles.footer}>
          <View style={styles.swipeContainer}>
            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionText}>Swipe to get started</Text>
            </View>
            <Animated.View
              style={[
                styles.draggableHandle,
                { 
                  transform: [{ translateX: pan.x }],
                  backgroundColor: handleColor,
                  opacity: isSwiped ? 0 : 1,
                  justifyContent: 'center',
                  alignItems: 'center'
                }
              ]}
              {...panResponder.panHandlers}
            >
              <Animated.View style={{ position: 'absolute', opacity: iconOrangeOpacity }}>
                <MaterialIcons name="keyboard-double-arrow-right" size={28} color="#D97B47" />
              </Animated.View>
              <Animated.View style={{ position: 'absolute', opacity: iconWhiteOpacity }}>
                <MaterialIcons name="keyboard-double-arrow-right" size={28} color="#FFFFFF" />
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};
