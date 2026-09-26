import React, { memo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
  Alert,
} from 'react-native';

export interface DashboardNavbarProps {
  user?: {
    uid?: string;
    email?: string;
    displayName?: string;
    photoURL?: string | null;
  };
  customAvatar?: ImageSourcePropType;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
}

const defaultAvatarSource = require('../../../assets/default-avatar.png');

export const DashboardNavbar: React.FC<DashboardNavbarProps> = memo(({
  user,
  customAvatar,
  onMenuPress,
  onProfilePress,
  onLogout,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
      return;
    }

    if (onLogout) {
      Alert.alert(
        user?.displayName || 'My Profile',
        user?.email ? `${user.email}` : 'Account options',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: onLogout,
          },
        ]
      );
    }
  };

  const userPhotoUri = user?.photoURL && user.photoURL.trim().length > 0 ? user.photoURL.trim() : null;

  const avatarSource: ImageSourcePropType = customAvatar
    ? customAvatar
    : userPhotoUri && !imageError
    ? { uri: userPhotoUri }
    : defaultAvatarSource;

  return (
    <View style={styles.container}>
      {/* Menu / Hamburger Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onMenuPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Navigation menu"
      >
        <View style={styles.menuIconWrapper}>
          <View style={[styles.menuLine, styles.menuLineShort]} />
          <View style={[styles.menuLine, styles.menuLineLong]} />
          <View style={[styles.menuLine, styles.menuLineLong]} />
        </View>
      </TouchableOpacity>

      {/* Profile Avatar Button */}
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={handleProfilePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="User profile"
      >
        <Image
          source={avatarSource}
          style={styles.avatarImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      </TouchableOpacity>
    </View>
  );
});

DashboardNavbar.displayName = 'DashboardNavbar';

export default DashboardNavbar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconWrapper: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuLine: {
    height: 2.8,
    backgroundColor: '#1E222B',
    borderRadius: 2,
  },
  menuLineShort: {
    width: 10,
  },
  menuLineLong: {
    width: 20,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E4F6D4',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
