import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8f6',
  },
  gradientContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    width: '100%',
    paddingTop: 100,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoText: {
    color: '#221a16', // Black logo as per image
    fontSize: 40,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -1,
  },
  mainCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 32,
    maxWidth: 400,
    zIndex: 10,
  },
  headline: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    color: '#221a16', // on-surface
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  highlightText: {
    color: '#D97B47', // primary-container
  },
  footer: {
    width: '100%',
    paddingBottom: 48,
    paddingHorizontal: 24,
    maxWidth: 400,
  },
  swipeContainer: {
    width: '100%',
    height: 64,
    backgroundColor: '#D97B47', // Orange container
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    shadowColor: '#D97B47',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  instructionTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 48, // Adjust text centering relative to the knob
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  draggableHandle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF', // White knob
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
});
