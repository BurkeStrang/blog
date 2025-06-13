/**
 * Lifecycle Management Engine
 * Automatic cleanup of animations, events, and resources
 */

export { AnimationManager as AnimationCleaner, animationManager as animationCleaner, useAnimationCleanup } from './AnimationCleaner';
export { EventManager as EventCleaner, eventManager as eventCleaner, useEventManager } from './EventCleaner';