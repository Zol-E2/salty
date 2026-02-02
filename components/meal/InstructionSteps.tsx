import { View, Text } from 'react-native';
import { InstructionStep } from '../../lib/types';

interface InstructionStepsProps {
  instructions: InstructionStep[];
}

export function InstructionSteps({ instructions }: InstructionStepsProps) {
  return (
    <View>
      {instructions.map((instruction, index) => (
        <View key={index} className="flex-row mb-4">
          <View className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-400 items-center justify-center mr-3 mt-0.5">
            <Text className="text-sm font-bold text-white">
              {instruction.step}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base text-slate-700 dark:text-slate-300 leading-6">
              {instruction.text}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
