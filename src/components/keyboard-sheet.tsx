import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Keyboard, Platform, View, type KeyboardEvent } from 'react-native';

export function KeyboardSheet({ children }: { children: ReactNode }) {
  const container = useRef<View>(null);
  const keyboardTop = useRef(
    Platform.OS === 'web' ? undefined : Keyboard.metrics()?.screenY,
  );
  const [inset, setInset] = useState(0);

  const updateInset = useCallback(() => {
    container.current?.measureInWindow((_x, y, _width, height) => {
      // Measure the full modal, not the content that shrinks when filtering.
      // A resized Android window already excludes some or all of the keyboard.
      setInset(
        keyboardTop.current == null
          ? 0
          : Math.max(0, y + height - keyboardTop.current),
      );
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      updateInset();
    };
    const hide = () => {
      keyboardTop.current = undefined;
      setInset(0);
    };
    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', show),
            Keyboard.addListener('keyboardWillHide', hide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', show),
            Keyboard.addListener('keyboardDidHide', hide),
          ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [updateInset]);

  return (
    <View
      ref={container}
      collapsable={false}
      onLayout={updateInset}
      style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <View
        style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: inset }}
      >
        {children}
      </View>
    </View>
  );
}
