import { accessibility } from '@kit.AccessibilityKit';

export class AccessibilityUtil {
  private static accessibilityEnabled: boolean = false;

  /**
   * Initialize accessibility detection.
   * Should be called once at app startup.
   */
  static init(): void {
    try {
      AccessibilityUtil.accessibilityEnabled = AccessibilityUtil.isAccessibilityEnabled();
    } catch {
      AccessibilityUtil.accessibilityEnabled = false;
    }
  }

  /**
   * Set accessibility text for a component identified by its ID.
   * The component must have accessibilityGroup(true) and an assigned ID.
   *
   * @param componentId - The ID of the target component
   * @param text - The accessibility text to set
   */
  static setAccessibilityText(componentId: string, text: string): void {
    try {
      accessibility.setAccessibilityText(componentId, text);
    } catch {
      // Accessibility API not available or component not found
    }
  }

  /**
   * Announce text via the screen reader / TalkBack.
   * Used to provide spoken feedback for dynamic content changes.
   *
   * @param text - The text to announce
   */
  static announceForAccessibility(text: string): void {
    try {
      accessibility.announceForAccessibility(text);
    } catch {
      // Accessibility API not available
    }
  }

  /**
   * Check whether the accessibility service / screen reader is enabled.
   *
   * @returns true if accessibility is enabled, false otherwise
   */
  static isAccessibilityEnabled(): boolean {
    try {
      return accessibility.isAccessibilityEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Get the cached accessibility state.
   *
   * @returns true if accessibility was detected as enabled during init()
   */
  static getCachedAccessibilityState(): boolean {
    return AccessibilityUtil.accessibilityEnabled;
  }

  /**
   * Update the cached accessibility state by re-checking the system service.
   */
  static refreshCachedState(): void {
    try {
      AccessibilityUtil.accessibilityEnabled = accessibility.isAccessibilityEnabled();
    } catch {
      AccessibilityUtil.accessibilityEnabled = false;
    }
  }

  /**
   * Generate a meaningful accessibility description from translation keys.
   *
   * @param label - The primary label text
   * @param hint - Optional hint text
   * @returns A combined accessibility description string
   */
  static buildAccessibilityLabel(label: string, hint?: string): string {
    if (hint) {
      return label + '. ' + hint;
    }
    return label;
  }

  /**
   * Request accessibility focus on a component by its ID.
   *
   * @param componentId - The ID of the component to focus
   */
  static requestFocus(componentId: string): void {
    try {
      accessibility.requestAccessibilityFocus(componentId);
    } catch {
      // Accessibility API not available
    }
  }
}

/**
 * AccessibilityGroup is a custom component that wraps its content slot
 * with accessibility group configuration.
 *
 * Usage:
 * ```ets
 * AccessibilityGroup({ accessibilityLabel: 'User profile section' }) {
 *   Column() { /* child components */ }
 * }
 * ```
 *
 * The children are passed via a @BuilderParam and wrapped in an
 * accessibility group container.
 */
@Component
export struct AccessibilityGroup {
  @Prop accessibilityLabel: string = '';
  @Prop accessibilityHint: string = '';
  @Prop accessibilityLevel: string = 'auto';
  @BuilderParam content: () => void = this.defaultContent;

  @Builder
  defaultContent() {
  }

  build() {
    Column() {
      this.content()
    }
    .accessibilityGroup(true)
    .accessibilityText(this.accessibilityLabel)
    .accessibilityDescription(this.accessibilityHint)
    .accessibilityLevel(this.accessibilityLevel as AccessibilityLevel)
  }
}
