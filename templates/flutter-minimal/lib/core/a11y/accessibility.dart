import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Mixin for StatelessWidget to provide accessible semantics.
///
/// Usage:
/// ```dart
/// class MyWidget extends StatelessWidget with AccessibleWidget {
///   @override
///   String get semanticLabel => 'Product: \$name, \$price';
///
///   @override
///   Widget build(BuildContext context) {
///     return buildWithAccessibility(
///       child: /* your widget tree */,
///     );
///   }
/// }
/// ```
mixin AccessibleWidget on StatelessWidget {
  /// Required semantic label for the widget.
  String get semanticLabel;

  /// Optional semantic hint describing the action.
  String? get semanticHint => null;

  /// Whether to exclude this widget from the semantics tree.
  bool get excludeFromSemantics => false;

  /// Wraps the child widget in a Semantics widget configured from mixin
  /// properties.
  Widget buildWithAccessibility(Widget child) {
    return Semantics(
      label: semanticLabel,
      hint: semanticHint,
      excludeSemantics: excludeFromSemantics,
      child: child,
    );
  }
}

/// Extension on BuildContext for accessibility operations.
extension AccessibilityExtension on BuildContext {
  /// Announces a message to the screen reader.
  ///
  /// Uses SemanticsService to make the announcement.
  void announceAccessibility(String message) {
    SemanticsService.announce(message, TextDirection.ltr);
  }

  /// Returns true if a screen reader (TalkBack / VoiceOver) is currently
  /// active.
  bool get isScreenReaderActive =>
      MediaQuery.of(this).accessibleNavigation;
}

/// Helper method to merge semantics of a subtree.
///
/// Shortcut for `MergeSemantics(child: child)`.
Widget mergeSemantics(Widget child) => MergeSemantics(child: child);

/// Helper method to exclude a widget from the semantics tree.
///
/// Shortcut for wrapping in `ExcludeSemantics(excluding: exclude, child: child)`.
Widget excludeSemantics(Widget child, {bool exclude = true}) =>
    ExcludeSemantics(excluding: exclude, child: child);

/// Extension on [Widget] to quickly wrap in a Semantics widget.
extension SemanticsExtension on Widget {
  /// Wraps this widget in a [Semantics] with the given [label], optional
  /// [hint], and optional [exclude] flag.
  Widget withSemantics({
    required String label,
    String? hint,
    bool exclude = false,
  }) =>
      Semantics(
        label: label,
        hint: hint,
        excludeSemantics: exclude,
        child: this,
      );
}
