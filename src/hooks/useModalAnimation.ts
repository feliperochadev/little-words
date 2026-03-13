import { useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { MODAL_ANIMATION } from '../utils/animationConstants';

/**
 * Custom hook for modal animations and pan responder gesture handling.
 * Provides consistent slide-in/slide-out animations and swipe-to-dismiss functionality.
 * 
 * @param visible - Whether the modal is currently visible
 * @param onClose - Callback function to invoke when modal is dismissed
 * @returns Object containing:
 *   - translateY: Animated value for vertical position
 *   - backdropOpacity: Animated value for backdrop opacity
 *   - dismissModal: Function to trigger modal dismissal animation
 *   - panResponder: Pan responder for swipe-to-dismiss gesture
 */
export function useModalAnimation(visible: boolean, onClose: () => void) {
  // Animation values
  const translateY = useRef(new Animated.Value(MODAL_ANIMATION.SLIDE_OUT_DISTANCE)).current;
  const backdropOpacity = useRef(new Animated.Value(MODAL_ANIMATION.BACKDROP_HIDDEN)).current;
  
  // Store the latest onClose callback in a ref to avoid stale closures
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  
  // Dismiss animation handler
  const dismissModal = useRef(() => {
    Animated.parallel([
      Animated.timing(translateY, { 
        toValue: MODAL_ANIMATION.SLIDE_OUT_DISTANCE, 
        duration: MODAL_ANIMATION.SLIDE_OUT_DURATION, 
        useNativeDriver: true 
      }),
      Animated.timing(backdropOpacity, { 
        toValue: MODAL_ANIMATION.BACKDROP_HIDDEN, 
        duration: MODAL_ANIMATION.FADE_OUT_DURATION, 
        useNativeDriver: true 
      }),
    ]).start(() => { onCloseRef.current(); });
  }).current;
  
  // Pan responder for swipe-to-dismiss gesture
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { 
      if (dy > 0) translateY.setValue(dy); 
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.8) {
        dismissModal();
      } else {
        Animated.spring(translateY, { 
          toValue: 0, 
          useNativeDriver: true, 
          friction: MODAL_ANIMATION.QUICK_CLOSE_FRICTION 
        }).start();
      }
    },
  })).current;
  
  // Show animation when modal becomes visible
  useEffect(() => {
    if (visible) {
      translateY.setValue(MODAL_ANIMATION.SLIDE_OUT_DISTANCE);
      backdropOpacity.setValue(MODAL_ANIMATION.BACKDROP_HIDDEN);
      Animated.parallel([
        Animated.spring(translateY, { 
          toValue: 0, 
          useNativeDriver: true, 
          friction: MODAL_ANIMATION.SLIDE_IN_FRICTION, 
          tension: MODAL_ANIMATION.SLIDE_IN_TENSION 
        }),
        Animated.timing(backdropOpacity, { 
          toValue: MODAL_ANIMATION.BACKDROP_VISIBLE, 
          duration: MODAL_ANIMATION.FADE_IN_DURATION, 
          useNativeDriver: true 
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);
  
  return {
    translateY,
    backdropOpacity,
    dismissModal,
    panResponder,
  };
}
