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
  customLogo?: ImageSourcePropType;
  onLogoPress?: () => void;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
}

const defaultAvatarSource = require('../../../assets/default-avatar.png');
const defaultLogoSource = require('../../../assets/logo.png');

export const DashboardNavbar: React.FC<DashboardNavbarProps> = memo(({
  user,
  customAvatar,
  customLogo,
  onLogoPress,
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

  const logoSource: ImageSourcePropType = customLogo || defaultLogoSource;

  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.logoButton}
        onPress={onLogoPress}
        activeOpacity={onLogoPress ? 0.7 : 1}
        disabled={!onLogoPress}
        accessibilityRole="image"
        accessibilityLabel="App logo"
      >
        <Image
          source={logoSource}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </TouchableOpacity>

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
  logoButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
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
