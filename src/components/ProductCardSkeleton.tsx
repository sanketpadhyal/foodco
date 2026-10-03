import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface SkeletonBoxProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBox({
  width,
  height,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>

      <View style={styles.badgeRow}>
        <SkeletonBox width={54} height={18} borderRadius={8} />
        <SkeletonBox width={20} height={20} borderRadius={6} />
      </View>

      <View style={styles.imageWrapper}>
        <SkeletonBox width={80} height={80} borderRadius={12} />
      </View>

      <View style={styles.infoSection}>
        <SkeletonBox width="45%" height={10} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonBox width="90%" height={13} borderRadius={4} style={{ marginBottom: 4 }} />
        <SkeletonBox width="65%" height={13} borderRadius={4} />
      </View>

      <View style={styles.footerRow}>
        <SkeletonBox width={7} height={7} borderRadius={3.5} />
        <SkeletonBox width="55%" height={10} borderRadius={4} />
      </View>
    </View>
  );
}

export interface ProductGridSkeletonProps {
  count?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ProductGridSkeleton({
  count = 6,
  contentContainerStyle,
}: ProductGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={[styles.gridContainer, contentContainerStyle]}>
      {Array.from({ length: Math.ceil(items.length / 2) }, (_, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.rowWrapper}>
          <ProductCardSkeleton />
          {rowIndex * 2 + 1 < items.length ? (
            <ProductCardSkeleton />
          ) : (
            <View style={{ width: CARD_WIDTH }} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  rowWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageWrapper: {
    width: '100%',
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  infoSection: {
    marginTop: 6,
    minHeight: 46,
    justifyContent: 'flex-start',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F6F8',
    gap: 6,
  },
});

export default ProductGridSkeleton;
