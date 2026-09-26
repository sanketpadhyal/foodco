import React, { memo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
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
  onProfilePress,
  onLogout,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else if (onLogout) {
      onLogout();
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
