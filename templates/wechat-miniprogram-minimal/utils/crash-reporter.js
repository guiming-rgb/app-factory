/**
 * crash-reporter.js — Crash reporter for WeChat Mini Program
 *
 * Batches error reports, stores pending reports in local storage for
 * offline resilience, and sends them via wx.request when possible.
 * Hooks into App.onError for automatic crash capture.
 *
 * Usage:
 *   var reporter = require('./utils/crash-reporter');
 *   reporter.init('https://your-dsn.example.com/report');
 *   reporter.setUser('user_12345');
 *   reporter.addBreadcrumb('User tapped login button');
 *   reporter.reportError(new Error('Something went wrong'));
 */

var BATCH_SIZE = 5;
var FLUSH_INTERVAL = 10000; // 10 seconds
var PENDING_KEY = 'crash_reports_pending';
var BREADCRUMBS_KEY = 'crash_breadcrumbs';
var MAX_BREADCRUMBS = 50;

var _dsn = '';
var _userId = '';
var _batch = [];
var _timer = null;
var _initialized = false;

/**
 * Escape special characters for safe string logging.
 */
function safeStr(v) {
  return String(v).replace(/[<>&"']/g, '');
}

/**
 * Get the current timestamp as an ISO string.
 */
function nowISO() {
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
}

/**
 * Get device/system context from WeChat.
 */
function getDeviceContext() {
  try {
    var sysInfo = wx.getSystemInfoSync();
    var appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
    var accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : {};
    return {
      platform: sysInfo.platform || '',
      model: sysInfo.model || '',
      system: sysInfo.system || '',
      language: sysInfo.language || '',
      version: sysInfo.version || '',
      SDKVersion: sysInfo.SDKVersion || '',
      benchmarkLevel: sysInfo.benchmarkLevel || 0,
      pixelRatio: sysInfo.pixelRatio || 0,
      windowWidth: sysInfo.windowWidth || 0,
      windowHeight: sysInfo.windowHeight || 0,
      fontSizeSetting: sysInfo.fontSizeSetting || 0,
      host: appBaseInfo.host || {},
      appId: accountInfo.miniProgram ? accountInfo.miniProgram.appId : ''
    };
  } catch (e) {
    return { platform: 'unknown', error: safeStr(e.message) };
  }
}

/**
 * Load breadcrumbs from storage.
 */
function loadBreadcrumbs() {
  try {
    var data = wx.getStorageSync(BREADCRUMBS_KEY);
    if (Array.isArray(data)) return data;
  } catch (e) { /* ignore */ }
  return [];
}

/**
 * Save breadcrumbs to storage.
 */
function saveBreadcrumbs(crumbs) {
  try {
    wx.setStorageSync(BREADCRUMBS_KEY, crumbs);
  } catch (e) { /* ignore */ }
}

/**
 * Load pending reports from storage.
 */
function loadPending() {
  try {
    var data = wx.getStorageSync(PENDING_KEY);
    if (Array.isArray(data)) return data;
  } catch (e) { /* ignore */ }
  return [];
}

/**
 * Save pending reports to storage.
 */
function savePending(reports) {
  try {
    wx.setStorageSync(PENDING_KEY, reports);
  } catch (e) { /* ignore */ }
}

/**
 * Flush the batch queue — send all accumulated reports.
 */
function flush() {
  if (_batch.length === 0) return;

  var reports = _batch.slice();
  _batch = [];

  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }

  // Save to pending storage for offline resilience
  var pending = loadPending();
  pending = pending.concat(reports);
  savePending(pending);

  sendReports(pending);
}

/**
 * Send reports via wx.request.
 */
function sendReports(reports) {
  if (!_dsn || reports.length === 0) return;

  try {
    wx.request({
      url: _dsn,
      method: 'POST',
      data: JSON.stringify({
        events: reports,
        sentAt: nowISO()
      }),
      header: {
        'content-type': 'application/json'
      },
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Sent successfully — clear pending storage
          savePending([]);
        } else {
          console.warn('[crash-reporter] Server returned', res.statusCode);
        }
      },
      fail: function (err) {
        console.warn('[crash-reporter] Failed to send reports:', err.errMsg || 'unknown error');
        // Reports remain in storage for retry on next flush
      }
    });
  } catch (e) {
    console.warn('[crash-reporter] Send exception:', safeStr(e.message));
  }
}

/**
 * Schedule an automatic flush after FLUSH_INTERVAL ms.
 */
function scheduleFlush() {
  if (_timer) return;
  _timer = setTimeout(function () {
    _timer = null;
    flush();
  }, FLUSH_INTERVAL);
}

/**
 * Initialize the crash reporter.
 *
 * @param {string} dsn - Endpoint URL for crash reports
 */
function init(dsn) {
  if (typeof dsn === 'string' && dsn.length > 0) {
    _dsn = dsn;
  }

  if (_initialized) return;
  _initialized = true;

  // Try to flush any pending reports from previous session
  var pending = loadPending();
  if (pending.length > 0) {
    sendReports(pending);
  }

  // Hook into App.onError
  try {
    var app = getApp();
    if (app) {
      var origOnError = app.onError;
      app.onError = function (error) {
        reportError(error);
        if (typeof origOnError === 'function') {
          origOnError.call(app, error);
        }
      };
    }
  } catch (e) {
    console.warn('[crash-reporter] Could not hook App.onError');
  }

  console.log('[crash-reporter] Initialized');
}

/**
 * Report an error.
 *
 * @param {Error|string} error - The error to report
 * @param {Object} [extra] - Additional context data
 */
function reportError(error, extra) {
  try {
    var errorObj = {
      type: 'error',
      message: '',
      stack: '',
      timestamp: nowISO(),
      userId: _userId,
      context: getDeviceContext(),
      extra: extra || {},
      breadcrumbs: loadBreadcrumbs()
    };

    if (error instanceof Error) {
      errorObj.message = error.message || String(error);
      errorObj.stack = error.stack || '';
      errorObj.name = error.name || 'Error';
    } else if (typeof error === 'string') {
      errorObj.message = error;
      errorObj.name = 'StringError';
    } else if (error && typeof error === 'object') {
      errorObj.message = error.message || error.errMsg || JSON.stringify(error);
      errorObj.stack = error.stack || '';
      errorObj.name = error.name || 'ObjectError';
    } else {
      errorObj.message = String(error);
      errorObj.name = 'UnknownError';
    }

    _batch.push(errorObj);
    scheduleFlush();

    if (_batch.length >= BATCH_SIZE) {
      flush();
    }
  } catch (e) {
    console.warn('[crash-reporter] reportError exception:', safeStr(e.message));
  }
}

/**
 * Set the current user identifier for error context.
 *
 * @param {string} userId - User identifier
 */
function setUser(userId) {
  _userId = typeof userId === 'string' ? userId : '';
}

/**
 * Add a breadcrumb — tracks user actions before a crash.
 *
 * @param {string} message - Description of the action
 * @param {string} [category] - Optional category (e.g. 'ui', 'network', 'auth')
 */
function addBreadcrumb(message, category) {
  try {
    if (typeof message !== 'string' || message.length === 0) return;

    var crumbs = loadBreadcrumbs();
    crumbs.push({
      message: message,
      category: typeof category === 'string' ? category : 'general',
      timestamp: nowISO()
    });

    // Keep only the most recent MAX_BREADCRUMBS
    if (crumbs.length > MAX_BREADCRUMBS) {
      crumbs = crumbs.slice(crumbs.length - MAX_BREADCRUMBS);
    }

    saveBreadcrumbs(crumbs);
  } catch (e) {
    console.warn('[crash-reporter] addBreadcrumb exception:', safeStr(e.message));
  }
}

module.exports = {
  init: init,
  reportError: reportError,
  setUser: setUser,
  addBreadcrumb: addBreadcrumb
};
