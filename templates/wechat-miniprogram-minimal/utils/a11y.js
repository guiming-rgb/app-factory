/**
 * a11y.js — Accessibility helpers for WeChat Mini Program
 *
 * Provides utilities for managing accessibility preferences,
 * adding aria-labels to WXML, haptic feedback announcements,
 * and screen reader detection.
 *
 * Usage:
 *   var a11y = require('./utils/a11y');
 *   a11y.announce('Page loaded');
 *   if (a11y.isAccessibilityEnabled()) { /* ... *\/ }
 */

var STORAGE_KEY = 'accessibility_enabled';

/**
 * Add an aria-label attribute to a WXML string.
 * Inserts aria-label="label" before the last '>' character.
 *
 * @param {string} wxml - The WXML string to modify
 * @param {string} label - The accessibility label text
 * @returns {string} Updated WXML with aria-label added
 */
function ariaLabel(wxml, label) {
  if (typeof wxml !== 'string' || typeof label !== 'string') {
    return wxml;
  }
  var escapedLabel = label.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var attr = ' aria-label="' + escapedLabel + '"';
  var lastClose = wxml.lastIndexOf('>');
  if (lastClose === -1) {
    return wxml + attr;
  }
  return wxml.slice(0, lastClose) + attr + wxml.slice(lastClose);
}

/**
 * Store accessibility preference.
 *
 * @param {boolean} enabled - Whether accessibility features should be enabled
 */
function setAccessibility(enabled) {
  try {
    wx.setStorageSync(STORAGE_KEY, !!enabled);
  } catch (e) {
    console.warn('[a11y] Failed to save accessibility preference:', e);
  }
}

/**
 * Provide accessibility feedback.
 * Uses haptic vibration (short) if available on the device.
 * Falls back to console logging.
 *
 * @param {string} message - The announcement message
 */
function announce(message) {
  if (typeof message !== 'string') return;

  console.log('[a11y] ' + message);

  try {
    wx.vibrateShort({
      type: 'medium',
      success: function () { /* haptic feedback sent */ },
      fail: function () {
        // Fallback: try light vibration
        wx.vibrateShort({
          type: 'light',
          fail: function () {
            // Device does not support vibration
          }
        });
      }
    });
  } catch (e) {
    // vibrateShort not available
  }
}

/**
 * Check if accessibility mode is enabled by user preference.
 *
 * @returns {boolean} Whether accessibility is enabled
 */
function isAccessibilityEnabled() {
  try {
    var stored = wx.getStorageSync(STORAGE_KEY);
    return stored === true;
  } catch (e) {
    return false;
  }
}

/**
 * Get the screen reader status from the system.
 * Checks if a screen reader (TalkBack, VoiceOver, etc.) is running.
 *
 * @returns {boolean} Whether a screen reader is active
 */
function getScreenReaderStatus() {
  try {
    var sysInfo = wx.getSystemInfoSync();
    // WeChat provides 'accessibilityEnabled' on some platforms
    if (sysInfo.accessibilityEnabled === true) {
      return true;
    }
    // Check for known screen reader indicators in the system info
    if (sysInfo.platform === 'android') {
      // On Android, check if TalkBack is potentially active
      // WeChat does not expose direct screen reader status on most devices
      return false;
    }
    if (sysInfo.platform === 'ios') {
      // On iOS, VoiceOver status is not exposed via WeChat API
      return false;
    }
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  ariaLabel: ariaLabel,
  setAccessibility: setAccessibility,
  announce: announce,
  isAccessibilityEnabled: isAccessibilityEnabled,
  getScreenReaderStatus: getScreenReaderStatus
};
