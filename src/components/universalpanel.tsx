import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Platform,
  BackHandler,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export type PanelAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'blue';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export interface UniversalPanelProps {
  visible: boolean;
  title?: string;
  titleUnderline?: boolean;
  message?: string;
  children?: ReactNode;
  actions?: PanelAction[];
  dismissOnBackdropPress?: boolean;
  onClose?: () => void;
  panelStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

export default function UniversalPanel({
  visible,
  title,
  titleUnderline = false,
  message,
  children,
  actions,
  dismissOnBackdropPress = true,
  onClose,
  panelStyle,
  maxWidth = 440,
}: UniversalPanelProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        return gs.dy > 4 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5;
      },
      onPanResponderGrant: () => {
        panY.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          // Resistance curve: drag slows down at larger distances
          const resistance = 1 - Math.min(gs.dy / 600, 0.4);
          panY.setValue(gs.dy * resistance);
        } else {
          // Slight resistance going up too
          panY.setValue(gs.dy * 0.1);
        }
      },
      onPanResponderRelease: (_, gs) => {
        const shouldDismiss =
          dismissOnBackdropPress && (gs.dy > 80 || (gs.vy > 0.5 && gs.dy > 20));

        if (shouldDismiss) {
          // Continue with the user's velocity into dismiss
          const remainingDist = 420 - gs.dy;
          const duration = Math.max(120, Math.min(280, remainingDist / Math.max(gs.vy, 0.5)));
          Animated.parallel([
            Animated.timing(panY, {
              toValue: 500,
              duration,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
              toValue: 0,
              duration,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start(() => {
            panY.setValue(0);
            onCloseRef.current?.();
          });
        } else {
          // Spring snap-back — feels alive and physical
          Animated.spring(panY, {
            toValue: 0,
            damping: 18,
            stiffness: 260,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: (_, gs) => {
        // Snap back if gesture is cancelled
        if (gs.dy < 80) {
          Animated.spring(panY, {
            toValue: 0,
            damping: 18,
            stiffness: 260,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      panY.setValue(0);
      slideAnim.setValue(420);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 420,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, mounted, backdropAnim, slideAnim, panY]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible || !mounted) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissOnBackdropPress && onCloseRef.current) {
        onCloseRef.current();
        return true;
      }
      return true;
    });
    return () => subscription.remove();
  }, [dismissOnBackdropPress, mounted, visible]);

  if (!mounted) return null;

  const resolvedActions: PanelAction[] =
    actions !== undefined
      ? actions
      : children
      ? []
      : [{ label: 'OK', onPress: onClose, variant: 'primary' }];

  const resolvedMaxWidth = Math.min(screenWidth, maxWidth || 440);
  const bottomPadding = Math.max(insets.bottom + 12, 22);
  const translateY = Animated.add(slideAnim, panY);

  // Backdrop fades proportionally as user drags — Instagram-style
  const backdropOpacity = Animated.multiply(
    backdropAnim,
    panY.interpolate({
      inputRange: [0, 300],
      outputRange: [1, 0.15],
      extrapolate: 'clamp',
    })
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.rootModalWrapper]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={!dismissOnBackdropPress}
          onPress={onClose}
        />
      </Animated.View>

      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          {...panResponder.panHandlers}
          renderToHardwareTextureAndroid={true}
          shouldRasterizeIOS={true}
          style={[
            styles.card,
            { maxWidth: resolvedMaxWidth, paddingBottom: bottomPadding },
            panelStyle,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {title ? (
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{title}</Text>
              {titleUnderline ? <View style={styles.titleUnderline} /> : null}
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {children ? <View style={styles.body}>{children}</View> : null}

          {resolvedActions.length > 0 ? (
            <View style={styles.actionsRow}>
              {resolvedActions.map((action) => {
                const isBlue = action.variant === 'blue';
                const isDanger = action.variant === 'danger';
                const isSecondary = action.variant === 'secondary';
                const isPrimary = action.variant === 'primary' || (!action.variant && !isBlue && !isDanger && !isSecondary);

                return (
                  <TouchableOpacity
                    key={action.label}
                    activeOpacity={0.82}
                    disabled={action.disabled || action.loading}
                    style={[
                      styles.actionBtn,
                      resolvedActions.length === 2 && styles.halfWidthBtn,
                      isPrimary && styles.primaryBtn,
                      isBlue && styles.blueBtn,
                      isSecondary && styles.secondaryBtn,
                      isDanger && styles.dangerBtn,
                      action.disabled && styles.disabledBtn,
                      action.style,
                    ]}
                    onPress={() => {
                      if (action.onPress) {
                        action.onPress();
                      } else {
                        onClose?.();
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        (isPrimary || isBlue || isDanger) && styles.primaryText,
                        isSecondary && styles.secondaryText,
                        action.textStyle,
                      ]}
                    >
                      {action.label}
                    </Text>
                    {action.loading ? (
                      <ActivityIndicator
                        size="small"
                        color={isPrimary || isBlue || isDanger ? '#FFFFFF' : '#475569'}
                        style={styles.btnLoader}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootModalWrapper: {
    zIndex: 1000,
    elevation: 50,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1000,
  },
  sheetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1001,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 14,
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#E2E5EA',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#0D0E11',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleUnderline: {
    height: 1,
    backgroundColor: '#F0F2F5',
    width: '100%',
    marginTop: 12,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 0,
  },
  actionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  halfWidthBtn: {
    flex: 1,
    minWidth: 0,
  },
  primaryBtn: {
    backgroundColor: '#FF6B35',
  },
  blueBtn: {
    backgroundColor: '#1A73E8',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#475569',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  btnLoader: {
    marginLeft: 8,
  },
});
