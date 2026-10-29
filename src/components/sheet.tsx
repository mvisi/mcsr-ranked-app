import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;
const MIN_CLOSE_SPEED = 2500; // px per second

// The slide is animated here, not by the Modal. Android's close animation
// starts from the resting position, so after a drag the sheet would jump
// back up and slide down a second time.
export function Sheet({
  visible,
  label,
  onClose,
  children,
}: {
  visible: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(visible);
  // Callers render nothing once closed, so keep the content for the slide out.
  const [content, setContent] = useState(children);
  if (visible && !mounted) setMounted(true);
  if (visible && content !== children) setContent(children);
  const onClosed = useCallback(() => setMounted(false), []);

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Mounted fresh for every opening, so no drag state carries over. */}
      {mounted && (
        <SheetBody
          visible={visible}
          label={label}
          onClose={onClose}
          onClosed={onClosed}
        >
          {visible ? children : content}
        </SheetBody>
      )}
    </Modal>
  );
}

function SheetBody({
  visible,
  label,
  onClose,
  onClosed,
  children,
}: {
  visible: boolean;
  label: string;
  onClose: () => void;
  onClosed: () => void;
  children: ReactNode;
}) {
  const screen = useWindowDimensions().height;
  const drag = useSharedValue(screen);
  const closing = useSharedValue(false);
  const height = useSharedValue(0);
  const scrollY = useSharedValue(0);
  // How far the finger had moved when the content reached the top.
  const anchor = useSharedValue(0);
  const scroller = useAnimatedRef<Animated.ScrollView>();

  useEffect(() => {
    if (visible) {
      closing.set(false);
      drag.set(
        withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }),
      );
    } else if (!closing.get()) {
      // A drag close has already started its own slide.
      closing.set(true);
      drag.set(
        withTiming(
          height.get() || screen,
          { duration: 220, easing: Easing.in(Easing.quad) },
          (finished) => {
            if (finished) scheduleOnRN(onClosed);
          },
        ),
      );
    }
  }, [visible, closing, drag, height, screen, onClosed]);

  const onScroll = useAnimatedScrollHandler((event) => {
    // Hold the content at the top while the sheet is being dragged down.
    if (drag.get() > 0 && event.contentOffset.y > 0) {
      scrollTo(scroller, 0, 0, false);
      return;
    }
    scrollY.value = event.contentOffset.y;
  });

  const native = Gesture.Native();
  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(native)
    .activeOffsetY([-8, 8])
    .onStart((event) => {
      anchor.value = event.translationY;
    })
    .onUpdate((event) => {
      if (closing.get()) return;
      if (drag.get() === 0 && scrollY.value > 0) {
        anchor.value = event.translationY;
        return;
      }
      drag.set(Math.max(0, event.translationY - anchor.value));
    })
    .onEnd((event) => {
      if (closing.get()) return;
      if (
        drag.get() > CLOSE_DISTANCE ||
        (drag.get() > 0 && event.velocityY > CLOSE_VELOCITY)
      ) {
        // Slide right away instead of waiting for the screen to re-render.
        closing.set(true);
        const remaining = (height.get() || screen) - drag.get();
        // An ease-out starts at twice its average speed, so this matches the
        // finger's speed at release.
        const speed = Math.max(event.velocityY, MIN_CLOSE_SPEED) / 1000;
        drag.set(
          withTiming(
            height.get() || screen,
            {
              duration: Math.min(280, Math.max(150, (2 * remaining) / speed)),
              easing: Easing.out(Easing.quad),
            },
            (finished) => {
              // A reopen during the slide cancels it and keeps the sheet.
              if (finished) scheduleOnRN(onClosed);
            },
          ),
        );
        scheduleOnRN(onClose);
      } else {
        drag.set(
          withSpring(0, {
            damping: 30,
            stiffness: 300,
            overshootClamping: true,
          }),
        );
      }
    });

  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.get() }],
  }));
  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(
      drag.get(),
      [0, height.get() || screen],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    // Modals render outside the app root, so gestures need their own.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}
      />
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onClose}
          className="flex-1"
        />
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(event) => {
              height.set(event.nativeEvent.layout.height);
            }}
            style={[{ maxHeight: '85%' }, sheet]}
          >
            <SafeAreaView
              edges={['bottom', 'left', 'right']}
              className="shrink rounded-t-xl border border-ranked-border bg-ranked-background"
            >
              <View className="items-center pb-1 pt-3">
                <View className="h-1 w-10 rounded-full bg-zinc-600" />
              </View>
              <GestureDetector gesture={native}>
                <Animated.ScrollView
                  ref={scroller}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  bounces={false}
                  overScrollMode="never"
                >
                  <View className="gap-5 px-5 pb-5 pt-3">{children}</View>
                </Animated.ScrollView>
              </GestureDetector>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
});
