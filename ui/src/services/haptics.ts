const MOBILE_HAPTIC_QUERY = "(hover: none), (pointer: coarse)";
const HAPTIC_DURATION_MS = 12;
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "summary",
  "label[for]",
  "input[type='button']",
  "input[type='submit']",
  "input[type='checkbox']",
  "input[type='radio']",
  "[data-haptic='true']",
].join(", ");

function supportsMobileHaptics(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(MOBILE_HAPTIC_QUERY).matches &&
    typeof window.navigator.vibrate === "function"
  );
}

export function triggerMobileHapticFeedback(pattern: number | number[] = HAPTIC_DURATION_MS): void {
  if (!supportsMobileHaptics()) return;
  window.navigator.vibrate(pattern);
}

export function installMobileHapticsListener(): () => void {
  if (!supportsMobileHaptics()) return () => {};

  const handleClick = (event: MouseEvent) => {
    if (!event.isTrusted || event.button !== 0) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(INTERACTIVE_SELECTOR)) return;

    triggerMobileHapticFeedback();
  };

  document.addEventListener("click", handleClick, true);

  return () => {
    document.removeEventListener("click", handleClick, true);
  };
}
