import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';

export interface DashboardProps {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
  };
  onLogout: () => void;
}

interface Item {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  rating: number;
  nutriscoreGrade?: string;
  novaGroup?: string;
}

const theme = {
  primary: '#FF6B35',
  primaryDark: '#E8502A',
  blue: '#1A73E8',
  bg: '#F8F9FB',
  white: '#FFFFFF',
  textPrimary: '#0D0E11',
  textSecondary: '#7F8489',
  border: '#E5E7EB',
};

const API_BASE = Platform.select({
  android: 'http://10.0.2.2:8080/api',
  default: 'http://localhost:8080/api',
});

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const CATEGORIES = ["All", "Snacks", "Beverages", "Dairy", "Grains", "Organic"];

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const insets = useSafeAreaInsets();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchItems = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/items/random?limit=20`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      if (data.success && data.items) {
        setItems(data.items);
      } else {
        throw new Error('Failed to fetch items');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchItems();
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || 
                            (item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  const popularItems = filteredItems.slice(0, 10);
  const recommendedItems = filteredItems.slice(10);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <AntDesign
          key={i}
          name="star"
          color={i <= rating ? '#FFB800' : '#E0E0E0'}
          size={14}
          style={styles.starIcon}
        />
      );
    }
    return stars;
  };

  const renderProductCard = ({ item }: { item: Item }) => (
    <View style={styles.card}>
      <View style={styles.cardImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.primary }]}>
            <Text style={styles.placeholderText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardBrand} numberOfLines={1}>
          {item.brand || 'Unknown Brand'}
        </Text>
        <View style={styles.ratingRow}>
          {renderStars(item.rating || 0)}
          <Text style={styles.ratingText}>{item.rating ? item.rating.toFixed(1) : 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Hello, {user.displayName || 'User'}</Text>
              <Text style={styles.subtitleText}>What would you like to eat?</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="bell" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Feather name="log-out" size={20} color={theme.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Items</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularListContainer}
          data={popularItems}
          keyExtractor={item => item.id}
          renderItem={renderProductCard}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
        </View>

        <View style={styles.recommendedContainer}>
          {recommendedItems.map(item => (
            <View key={item.id} style={styles.recommendedCard}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.recommendedImage} resizeMode="contain" />
              ) : (
                <View style={[styles.recommendedPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.placeholderText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.recommendedInfo}>
                <Text style={styles.recommendedTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.recommendedBrand} numberOfLines={1}>
                  {item.brand || 'Unknown Brand'}
                </Text>
                <View style={styles.ratingRow}>
                  {renderStars(item.rating || 0)}
                  <Text style={styles.ratingText}>{item.rating ? item.rating.toFixed(1) : 'N/A'}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.white,
    fontSize: 20,
    fontWeight: '600',
  },
  greetingContainer: {
    marginLeft: 12,
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 18,
    fontFamily: serifFont,
    color: theme.textPrimary,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: 4,
  },
  categoryChipSelected: {
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  categoryText: {
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: theme.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: serifFont,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.blue,
    fontWeight: '500',
  },
  popularListContainer: {
    paddingHorizontal: 16,
  },
  card: {
    width: 160,
    height: 220,
    backgroundColor: theme.white,
    borderRadius: 16,
    marginHorizontal: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.white,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  recommendedContainer: {
    paddingHorizontal: 20,
  },
  recommendedCard: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  recommendedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  recommendedPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  recommendedBrand: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 16,
    color: theme.textPrimary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
