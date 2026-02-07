import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useMealPlanForMonth } from '../../hooks/useMealPlan';
import { useThemeStore } from '../../stores/themeStore';
import { SLOT_COLORS } from '../../lib/constants';
import { MealSlotType } from '../../lib/types';
import { AnimatedCard } from '../../components/ui/AnimatedCard';

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const currentYear = parseInt(selectedDate.split('-')[0]);
  const currentMonth = parseInt(selectedDate.split('-')[1]);

  const themeMode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const { data: planItems } = useMealPlanForMonth(currentYear, currentMonth);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    planItems?.forEach((item) => {
      if (!marks[item.date]) {
        marks[item.date] = { dots: [] };
      }
      const color = SLOT_COLORS[item.slot as MealSlotType] || '#10B981';
      if (!marks[item.date].dots.find((d: any) => d.color === color)) {
        marks[item.date].dots.push({ key: item.slot, color });
      }
    });
    return marks;
  }, [planItems]);

  const selectedDateFormatted = new Date(selectedDate + 'T12:00:00')
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

  const mealsForSelectedDate = planItems?.filter(
    (item) => item.date === selectedDate
  );

  const emeraldColor = isDark ? '#34D399' : '#10B981';

  const renderDay = ({ date, state, marking }: any) => {
    const dateString = date.dateString;
    const isSelected = dateString === selectedDate;
    const isToday = dateString === today;
    const isDisabled = state === 'disabled';
    const dots = marking?.dots || [];

    const textColor = isSelected
      ? '#FFFFFF'
      : isToday
        ? emeraldColor
        : isDisabled
          ? (isDark ? '#334155' : '#CBD5E1')
          : (isDark ? '#F8FAFC' : '#0F172A');

    return (
      <TouchableOpacity
        onPress={() => !isDisabled && setSelectedDate(dateString)}
        activeOpacity={isDisabled ? 1 : 0.5}
        style={styles.dayContainer}
      >
        <View
          style={[
            styles.dayCircle,
            isSelected && { backgroundColor: emeraldColor },
          ]}
        >
          <Text style={[styles.dayText, { color: textColor }]}>
            {date.day}
          </Text>
        </View>
        <View style={styles.dotsRow}>
          {dots.map((dot: { key: string; color: string }) => (
            <View
              key={dot.key}
              style={[styles.dot, { backgroundColor: dot.color }]}
            />
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const mealsByDate = useMemo(() => {
    if (!planItems || planItems.length === 0) return [];

    const grouped: Record<string, typeof planItems> = {};
    planItems.forEach((item) => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });

    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        title: date,
        data: grouped[date],
      }));
  }, [planItems]);

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          Meal Plan
        </Text>
        <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
          <TouchableOpacity
            onPress={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg ${
              viewMode === 'month'
                ? 'bg-white dark:bg-slate-700'
                : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                viewMode === 'month'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700'
                : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                viewMode === 'list'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'month' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Calendar
            key={`${selectedDate}-${isDark}`}
            current={selectedDate}
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            dayComponent={renderDay}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: isDark ? '#94A3B8' : '#64748B',
              monthTextColor: isDark ? '#F8FAFC' : '#0F172A',
              arrowColor: emeraldColor,
              textMonthFontWeight: '700',
            }}
          />

          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {selectedDateFormatted}
              </Text>
              <TouchableOpacity
                onPress={() => router.push(`/day/${selectedDate}`)}
                className="flex-row items-center"
              >
                <Text className="text-sm font-medium text-primary-500 dark:text-primary-400 mr-1">
                  View all
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={isDark ? '#34D399' : '#10B981'}
                />
              </TouchableOpacity>
            </View>

            {mealsForSelectedDate && mealsForSelectedDate.length > 0 ? (
              mealsForSelectedDate.map((item, index) => (
                <AnimatedCard key={`${selectedDate}-${item.id}`} index={index} staggerMs={60}>
                  <TouchableOpacity
                    onPress={() => router.push(`/meal/${item.meal_id}`)}
                    className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-2"
                  >
                    <View
                      className="w-3 h-3 rounded-full mr-3"
                      style={{
                        backgroundColor:
                          SLOT_COLORS[item.slot as MealSlotType] || '#10B981',
                      }}
                    />
                    <View className="flex-1">
                      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {item.slot}
                      </Text>
                      <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.meal?.name ?? 'Unknown meal'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </AnimatedCard>
              ))
            ) : (
              <View className="items-center py-8">
                <Ionicons
                  name="restaurant-outline"
                  size={40}
                  color={isDark ? '#334155' : '#CBD5E1'}
                />
                <Text className="text-sm text-slate-400 dark:text-slate-500 mt-3">
                  No meals planned for this day
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(`/day/${selectedDate}`)}
                  className="mt-3"
                >
                  <Text className="text-sm font-semibold text-primary-500 dark:text-primary-400">
                    Add meals
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={mealsByDate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          renderSectionHeader={({ section: { title } }) => {
            const formatted = new Date(title + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            const isToday = title === today;
            return (
              <View className="flex-row items-center pt-4 pb-2">
                <Text className="text-base font-semibold text-slate-900 dark:text-white">
                  {formatted}
                </Text>
                {isToday && (
                  <View className="ml-2 px-2 py-0.5 bg-primary-500 dark:bg-primary-400 rounded-full">
                    <Text className="text-xs font-semibold text-white">Today</Text>
                  </View>
                )}
              </View>
            );
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/meal/${item.meal_id}`)}
              className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-2"
            >
              <View
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: SLOT_COLORS[item.slot as MealSlotType] || '#10B981' }}
              />
              <View className="flex-1">
                <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {item.slot}
                </Text>
                <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.meal?.name ?? 'Unknown meal'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-8">
              <Ionicons name="restaurant-outline" size={40} color={isDark ? '#334155' : '#CBD5E1'} />
              <Text className="text-sm text-slate-400 dark:text-slate-500 mt-3">
                No meals planned this month
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dayContainer: { alignItems: 'center', justifyContent: 'center', height: 46, width: 32 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dayText: { fontSize: 15, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 8, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
