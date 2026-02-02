import { View, Text } from 'react-native';

interface MacroBarProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroBar({ calories, protein, carbs, fat }: MacroBarProps) {
  const total = protein + carbs + fat;
  const proteinPct = total > 0 ? (protein / total) * 100 : 33;
  const carbsPct = total > 0 ? (carbs / total) * 100 : 33;
  const fatPct = total > 0 ? (fat / total) * 100 : 34;

  return (
    <View>
      <View className="flex-row items-center mb-2">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">
          {calories}
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 ml-1">
          calories
        </Text>
      </View>

      <View className="flex-row h-3 rounded-full overflow-hidden mb-3">
        <View
          style={{ width: `${proteinPct}%` }}
          className="bg-blue-500 rounded-l-full"
        />
        <View style={{ width: `${carbsPct}%` }} className="bg-amber-500" />
        <View
          style={{ width: `${fatPct}%` }}
          className="bg-rose-400 rounded-r-full"
        />
      </View>

      <View className="flex-row justify-between">
        <MacroItem label="Protein" value={protein} unit="g" color="#3B82F6" />
        <MacroItem label="Carbs" value={carbs} unit="g" color="#F59E0B" />
        <MacroItem label="Fat" value={fat} unit="g" color="#FB7185" />
      </View>
    </View>
  );
}

function MacroItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View className="items-center">
      <View className="flex-row items-center mb-1">
        <View
          className="w-2.5 h-2.5 rounded-full mr-1.5"
          style={{ backgroundColor: color }}
        />
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {label}
        </Text>
      </View>
      <Text className="text-base font-semibold text-slate-900 dark:text-white">
        {value}
        <Text className="text-xs text-slate-400">{unit}</Text>
      </Text>
    </View>
  );
}
