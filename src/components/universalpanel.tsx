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
} from 'react-native';

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export type PanelAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
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
  maxWidth = 330,
}: UniversalPanelProps) {
  const [mounted, setMounted] = useState(visible);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const translateYAnim = useRef(new Animated.Value(24)).current;
  const panelOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropAnim.setValue(0);
      scaleAnim.setValue(0.88);
      translateYAnim.setValue(24);
      panelOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 24,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacityAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 16,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, mounted, backdropAnim, scaleAnim, translateYAnim, panelOpacityAnim]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible || !mounted) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissOnBackdropPress && onClose) {
        onClose();
        return true;
      }
      return true;
    });
    return () => subscription.remove();
  }, [dismissOnBackdropPress, mounted, onClose, visible]);

  if (!mounted) return null;

  const resolvedActions: PanelAction[] =
    actions !== undefined
      ? actions
      : children
      ? []
      : [{ label: 'OK', onPress: onClose, variant: 'primary' }];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={!dismissOnBackdropPress}
          onPress={onClose}
        />
      </Animated.View>

      <View style={styles.centerContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { maxWidth },
            panelStyle,
            {
              opacity: panelOpacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
        >
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
                const isPrimary = action.variant === 'primary' || !action.variant;
                const isDanger = action.variant === 'danger';
                const isSecondary = action.variant === 'secondary';

                return (
                  <TouchableOpacity
                    key={action.label}
                    activeOpacity={0.82}
                    disabled={action.disabled || action.loading}
                    style={[
                      styles.actionBtn,
                      resolvedActions.length === 2 && styles.halfWidthBtn,
                      isPrimary && styles.primaryBtn,
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
                        isPrimary && styles.primaryText,
                        isSecondary && styles.secondaryText,
                        isDanger && styles.dangerText,
                        action.textStyle,
                      ]}
                    >
                      {action.label}
                    </Text>
                    {action.loading ? (
                      <ActivityIndicator
                        size="small"
                        color={isPrimary || isDanger ? '#FFFFFF' : '#475569'}
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1000,
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1001,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 19,
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
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 20,
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
