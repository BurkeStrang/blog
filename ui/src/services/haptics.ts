const MOBILE_HAPTIC_QUERY = "(hover: none), (pointer: coarse)";
const HAPTIC_DURATION_MS = 12;
const IOS_HAPTIC_SWITCH_ID = "ios-haptic-switch";
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

let iosHapticSwitchTrigger: (() => void) | null = null;

function supportsMobileHaptics(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(MOBILE_HAPTIC_QUERY).matches &&
    typeof window.navigator.vibrate === "function"
  );
}

function supportsIOSSwitchHaptics(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIOSDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isWebKit = /WebKit/i.test(ua);
  const isExcludedBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return (
    window.matchMedia(MOBILE_HAPTIC_QUERY).matches &&
    isIOSDevice &&
    isWebKit &&
    !isExcludedBrowser
  );
}

function getIOSSwitchHapticTrigger(): (() => void) | null {
  if (!supportsIOSSwitchHaptics()) return null;
  if (iosHapticSwitchTrigger) return iosHapticSwitchTrigger;

  const existingInput = document.getElementById(IOS_HAPTIC_SWITCH_ID);
  if (existingInput instanceof HTMLInputElement) {
    iosHapticSwitchTrigger = () => {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${IOS_HAPTIC_SWITCH_ID}"]`);
      if (!label) return;
      label.click();
    };
    return iosHapticSwitchTrigger;
  }

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = IOS_HAPTIC_SWITCH_ID;
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.left = "-9999px";
  input.style.top = "-9999px";

  const label = document.createElement("label");
  label.htmlFor = IOS_HAPTIC_SWITCH_ID;
  label.setAttribute("aria-hidden", "true");
  label.style.position = "fixed";
  label.style.opacity = "0";
  label.style.pointerEvents = "none";
  label.style.width = "1px";
  label.style.height = "1px";
  label.style.left = "-9999px";
  label.style.top = "-9999px";

  document.body.append(input, label);

  iosHapticSwitchTrigger = () => {
    label.click();
  };

  return iosHapticSwitchTrigger;
}

export function triggerMobileHapticFeedback(pattern: number | number[] = HAPTIC_DURATION_MS): void {
  if (supportsMobileHaptics()) {
    window.navigator.vibrate(pattern);
    return;
  }

  getIOSSwitchHapticTrigger()?.();
}

export function installMobileHapticsListener(): () => void {
  if (!supportsMobileHaptics() && !supportsIOSSwitchHaptics()) return () => {};

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
