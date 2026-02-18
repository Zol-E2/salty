import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated } from 'react-native';

const TIPS = [
  'Buying chicken thighs instead of breasts saves up to 40% — and they\'re juicier too.',
  'Frozen vegetables are just as nutritious as fresh and cost a fraction of the price.',
  'Batch cooking on Sunday and portioning it out is the easiest way to cut your food bill.',
  'Store-brand pantry staples — rice, oats, canned beans — are often identical to name brands.',
  'An egg is one of the cheapest sources of complete protein you can buy.',
  'Salt your pasta water until it tastes like the sea — your pasta won\'t need extra salt after.',
  'Letting meat rest for 5 minutes after cooking keeps the juices inside instead of on your plate.',
  'A hot pan before adding oil means food won\'t stick — it\'s the surface, not the oil, that matters.',
  'A splash of lemon juice or vinegar at the end brightens any dish that tastes flat.',
  'Revive wilting vegetables by soaking them in ice water for 15 minutes.',
  'Protein takes longer to digest than carbs, which is why high-protein meals keep you full longer.',
  'Oats contain beta-glucan, a fibre shown to lower LDL cholesterol.',
  'Brown and white rice have similar calories — the difference is fibre and micronutrients.',
];

function shuffleArray(arr: string[]): string[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const CHAR_DELAY = 50;
const HOLD_DURATION = 4000;
const FADE_IN_DURATION = 200;
const FADE_OUT_DURATION = 350;
const BETWEEN_PAUSE = 300;
const CURSOR_BLINK_MS = 500;

export function TypewriterTips() {
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tipsQueueRef = useRef<string[]>(shuffleArray(TIPS));
  const tipIndexRef = useRef(0);

  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const cursorLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const startCursorBlink = useCallback(() => {
    cursorOpacity.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: CURSOR_BLINK_MS,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: CURSOR_BLINK_MS,
          useNativeDriver: true,
        }),
      ])
    );
    cursorLoopRef.current = loop;
    loop.start();
  }, [cursorOpacity]);

  const stopCursorBlink = useCallback(() => {
    cursorLoopRef.current?.stop();
    cursorLoopRef.current = null;
    cursorOpacity.setValue(0);
  }, [cursorOpacity]);

  const getNextTip = useCallback((): string => {
    const queue = tipsQueueRef.current;
    if (tipIndexRef.current >= queue.length) {
      tipsQueueRef.current = shuffleArray(TIPS);
      tipIndexRef.current = 0;
    }
    return queue[tipIndexRef.current++];
  }, []);

  const runTipCycle = useCallback(() => {
    if (!mountedRef.current) return;

    const tip = getNextTip();
    setDisplayedText('');
    setShowCursor(true);

    // Phase 1: Fade in container
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: FADE_IN_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (!mountedRef.current) return;

      // Phase 2: Type characters one by one
      startCursorBlink();
      for (let i = 0; i < tip.length; i++) {
        addTimer(() => {
          if (!mountedRef.current) return;
          setDisplayedText(tip.slice(0, i + 1));
        }, i * CHAR_DELAY);
      }

      // Phase 3: Hold with blinking cursor after typing completes
      const typingDuration = tip.length * CHAR_DELAY;
      addTimer(() => {
        if (!mountedRef.current) return;

        // Phase 4: Stop cursor and fade out
        addTimer(() => {
          if (!mountedRef.current) return;
          stopCursorBlink();
          setShowCursor(false);

          Animated.timing(containerOpacity, {
            toValue: 0,
            duration: FADE_OUT_DURATION,
            useNativeDriver: true,
          }).start(() => {
            if (!mountedRef.current) return;

            // Phase 5: Brief pause, then next tip
            addTimer(() => {
              runTipCycle();
            }, BETWEEN_PAUSE);
          });
        }, HOLD_DURATION);
      }, typingDuration);
    });
  }, [containerOpacity, addTimer, startCursorBlink, stopCursorBlink, getNextTip]);

  useEffect(() => {
    mountedRef.current = true;
    runTipCycle();

    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      cursorLoopRef.current?.stop();
    };
  }, []);

  return (
    <Animated.View style={{ opacity: containerOpacity, minHeight: 40, paddingHorizontal: 16 }}>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
        {displayedText}
        {showCursor && (
          <Animated.Text
            style={{ opacity: cursorOpacity }}
            className="text-sm text-primary-500 dark:text-primary-400 font-bold"
          >
            |
          </Animated.Text>
        )}
      </Text>
    </Animated.View>
  );
}
