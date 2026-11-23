import { useCallback, useEffect, useState } from "react";

/** Counts down from `initialSeconds` to 0, one tick per second. `restart` starts it over. */
export function useCountdown(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const restart = useCallback(
    () => setSecondsLeft(initialSeconds),
    [initialSeconds],
  );

  return { secondsLeft, restart };
}
