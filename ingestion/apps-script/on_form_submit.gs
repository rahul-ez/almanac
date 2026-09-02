/**
 * Campus Companion — Google Apps Script Ingestion Trigger
 *
 * This script is bound to the Google Form (or its linked Google Sheet) for event registration.
 * On every form submission, the onFormSubmit trigger extracts registrant information
 * and posts it to the Campus Companion /api/ingest/attendance endpoint.
 *
 * Contract:
 * POST /api/ingest/attendance
 * {
 *   "token": "shared-ingestion-secret",
 *   "event_id": "evt_001",
 *   "registrant_name": "Aditi Sharma",
 *   "registrant_email": "aditi.sharma@campus.edu",
 *   "submitted_at": "2026-09-05T14:58:00"
 * }
 */

// Configuration Constants / Default Fallbacks
// In production, configure these via Script Properties:
// File > Project Properties > Script Properties (or Project Settings > Script Properties)
// Keys: INGEST_API_URL, INGEST_TOKEN
var DEFAULT_INGEST_API_URL = "https://<your-databricks-app-url>/api/ingest/attendance";
var DEFAULT_INGEST_TOKEN = "shared-ingestion-secret";

/**
 * Helper to fetch configuration from Script Properties with fallback to defaults.
 */
function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    apiUrl: props.getProperty("INGEST_API_URL") || DEFAULT_INGEST_API_URL,
    token: props.getProperty("INGEST_TOKEN") || DEFAULT_INGEST_TOKEN
  };
}

/**
 * Format a Date object to ISO 8601 campus-local timestamp (YYYY-MM-DDTHH:MM:SS)
 * per data-contracts.md semantics (no timezone suffix, no fractional seconds).
 */
function formatLocalIsoTimestamp(date) {
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var year = date.getFullYear();
  var month = pad(date.getMonth() + 1);
  var day = pad(date.getDate());
  var hours = pad(date.getHours());
  var minutes = pad(date.getMinutes());
  var seconds = pad(date.getSeconds());
  return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds;
}

/**
 * Event map helper: converts an Event Name choice to canonical event_id if the form
 * uses human-readable event titles in dropdowns/choices.
 */
var EVENT_NAME_TO_ID = {
  "AI Workshop": "evt_001",
  "Robotics Showcase": "evt_002",
  "Hackathon Info Session": "evt_003",
  "Web Dev Bootcamp": "evt_004",
  "Design Systems Workshop": "evt_005"
};

/**
 * Main Trigger Handler: onFormSubmit
 * Can be installed as an installable trigger on either:
 * 1. Google Form: "On form submit"
 * 2. Google Sheet (linked responses): "On form submit"
 *
 * @param {Object} e Event object passed by Google Apps Script trigger
 */
function onFormSubmit(e) {
  var timestamp = new Date();
  var submittedAt = formatLocalIsoTimestamp(timestamp);
  
  var eventId = "evt_001"; // default for demo
  var registrantName = "";
  var registrantEmail = "";

  try {
    if (e && e.response) {
      // Triggered from Google Form directly
      var itemResponses = e.response.getItemResponses();
      for (var i = 0; i < itemResponses.length; i++) {
        var item = itemResponses[i];
        var title = item.getItem().getTitle().toLowerCase().trim();
        var response = item.getResponse();

        if (title.indexOf("event") !== -1) {
          eventId = resolveEventId(response);
        } else if (title.indexOf("name") !== -1) {
          registrantName = String(response).trim();
        } else if (title.indexOf("email") !== -1) {
          registrantEmail = String(response).trim();
        }
      }
      
      // Fallback for registrant email if collected via Form Settings
      if (!registrantEmail && e.response.getRespondentEmail) {
        registrantEmail = e.response.getRespondentEmail() || "";
      }
    } else if (e && e.namedValues) {
      // Triggered from Linked Google Sheet
      var namedValues = e.namedValues;
      for (var key in namedValues) {
        var cleanKey = key.toLowerCase().trim();
        var val = namedValues[key] && namedValues[key][0] ? String(namedValues[key][0]).trim() : "";
        if (cleanKey.indexOf("event") !== -1) {
          eventId = resolveEventId(val);
        } else if (cleanKey.indexOf("name") !== -1) {
          registrantName = val;
        } else if (cleanKey.indexOf("email") !== -1) {
          registrantEmail = val;
        }
      }
    } else if (e && e.values) {
      // Triggered from Sheet with array of row values: [Timestamp, Name, Email, Event]
      if (e.values.length >= 4) {
        registrantName = String(e.values[1]).trim();
        registrantEmail = String(e.values[2]).trim();
        eventId = resolveEventId(String(e.values[3]).trim());
      }
    } else {
      Logger.log("Warning: onFormSubmit invoked without event object e. Using default test values.");
      registrantName = "Demo Attendee";
      registrantEmail = "demo.attendee@campus.edu";
      eventId = "evt_001";
    }

    // Ensure we have fallback values if some fields were empty
    if (!registrantName) registrantName = "Anonymous Student";
    if (!registrantEmail) registrantEmail = "student@campus.edu";
    if (!eventId) eventId = "evt_001";

    var payload = {
      token: getConfig().token,
      event_id: eventId,
      registrant_name: registrantName,
      registrant_email: registrantEmail,
      submitted_at: submittedAt
    };

    Logger.log("Dispatching attendance ingestion payload: " + JSON.stringify(payload));
    sendIngestionWebhook(payload);

  } catch (err) {
    Logger.log("Error processing onFormSubmit: " + err.toString());
  }
}

/**
 * Resolve event string (ID or Name) to canonical event_id (e.g. "evt_001")
 */
function resolveEventId(rawInput) {
  if (!rawInput) return "evt_001";
  var trimmed = String(rawInput).trim();
  // If it already matches format evt_XXX, return directly
  if (/^evt_\d+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  // Check mapping table
  if (EVENT_NAME_TO_ID[trimmed]) {
    return EVENT_NAME_TO_ID[trimmed];
  }
  // If input contains "(evt_001)" extract ID
  var match = trimmed.match(/evt_\d+/i);
  if (match) {
    return match[0].toLowerCase();
  }
  return "evt_001";
}

/**
 * Post JSON payload to the Campus Companion backend /api/ingest/attendance
 */
function sendIngestionWebhook(payload) {
  var config = getConfig();
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(config.apiUrl, options);
    var statusCode = response.getResponseCode();
    var responseBody = response.getContentText();

    Logger.log("Webhook response status: " + statusCode);
    Logger.log("Webhook response body: " + responseBody);

    if (statusCode === 201) {
      Logger.log("Successfully ingested attendance for event: " + payload.event_id);
    } else {
      Logger.log("Ingestion failed with status " + statusCode + ": " + responseBody);
    }
  } catch (error) {
    Logger.log("Exception during UrlFetchApp.fetch to " + config.apiUrl + ": " + error.toString());
  }
}

/**
 * Test function for manual execution inside the Apps Script Editor
 */
function testSubmission() {
  Logger.log("Running manual testSubmission...");
  var mockEvent = {
    namedValues: {
      "Event": ["AI Workshop (evt_001)"],
      "Full Name": ["Aditi Sharma"],
      "Campus Email": ["aditi.sharma@campus.edu"]
    }
  };
  onFormSubmit(mockEvent);
}

/**
 * Test function against local/ngrok/deployed URL directly
 */
function testDirectWebhook() {
  var config = getConfig();
  var testPayload = {
    token: config.token,
    event_id: "evt_001",
    registrant_name: "Test Runner",
    registrant_email: "test.runner@campus.edu",
    submitted_at: formatLocalIsoTimestamp(new Date())
  };
  Logger.log("Testing direct webhook call to: " + config.apiUrl);
  sendIngestionWebhook(testPayload);
}
