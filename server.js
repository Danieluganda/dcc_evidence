// ==============================
// IMPORTS
// ==============================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const crypto = require('crypto');

// ==============================
// APP SETUP
// ==============================
const app = express();
const upload = multer();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// ==============================
// KOBO CONFIG
// ==============================
const KOBO_FORM_ID = 'aNZHBjwUHgTJUUSbZuEhFd';
const KOBO_TOKEN = '070760df54724dec37f37cef0c2f572e184af535'; // 🔴 replace this
const KOBO_URL = 'https://kc.kobotoolbox.org/submission';

// ==============================
// VALUE MAPPINGS
// ==============================
const MAP = {
  outcomes: {
    'Got a job': 'job',
    'Started a business': 'business',
    'Made a sale': 'sale',
    'Increased income': 'income',
    'Accessed digital credit': 'credit'
  },
  evidence_type: {
    'Photo': 'photo',
    'Screenshot': 'screenshot'
  },
  source: {
    'Self-reported by participant': 'self',
    'Platform-generated (WhatsApp, Jumia, etc.)': 'platform',
    'Field officer': 'field',
    'Financial institution (SACCO / bank)': 'financial'
  },
  verification_status: {
    'Pending review': 'pending',
    'Pending': 'pending',
    'Verified': 'verified',
    'Rejected': 'rejected'
  },
  verification_method: {
    'Field visit': 'field_visit',
    'Phone call': 'call',
    'Call confirmation': 'call',
    'System verification': 'system'
  },
  confidence: {
    'High — strong, verifiable evidence': 'high',
    'Medium — plausible, some gaps': 'medium',
    'Low — weak evidence': 'low'
  },
  followup: {
    'Yes': 'yes',
    'No': 'no'
  }
};

// ==============================
// ROUTE
// ==============================
app.post('/submit-to-kobo', upload.any(), async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);

    let incoming = JSON.parse(req.body.data || '{}');
    const file = req.files?.[0];

    // --------------------
    // HELPERS
    // --------------------
    const escapeXml = (unsafe = '') =>
      String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const instanceID = `uuid:${crypto.randomUUID()}`;

    // --------------------
    // GPS FIX
    // --------------------
    let gps = incoming.gps || '';
    if (gps.includes(',')) {
      gps = gps.replace(',', ' ') + ' 0 0';
    }

    // --------------------
    // HANDLE MULTI-SELECT
    // --------------------
    let outcomesValue = incoming.outcomes || incoming.outcome;

    if (Array.isArray(outcomesValue)) {
      outcomesValue = outcomesValue
        .map(o => MAP.outcomes[o])
        .filter(Boolean)
        .join(' ');
    } else {
      outcomesValue = MAP.outcomes[outcomesValue] || '';
    }

    // --------------------
    // BUILD FIELDS
    // --------------------
    const fields = {
      evidence_id: incoming.evidence_id,
      participant_id: incoming.participant_id,
      intervention_id: incoming.intervention_id,
      dcc_name: incoming.dcc_name || incoming.dcc_agent,
      participant_name: incoming.participant_name,
      phone: incoming.phone,
      business_name: incoming.business_name,
      email: incoming.email,
      national_id: incoming.national_id,
      outcomes: outcomesValue,
      outcome_date: incoming.outcome_date,
      description: incoming.outcome_desc || incoming.description,
      income_before: incoming.income_before || '0',
      income_after: incoming.income_after || '0',
      files: file?.originalname,
      evidence_type: MAP.evidence_type[incoming.evidence_type],
      evidence_desc: incoming.evidence_desc,
      source: MAP.source[incoming.source],
      confidence: MAP.confidence[incoming.confidence] || 'medium',
      verification_status: MAP.verification_status[incoming.verification_status],
      verification_method: MAP.verification_method[incoming.verification_method],
      verified_by: incoming.verified_by,
      verification_org: incoming.verified_org,
      gps: gps,
      followup: MAP.followup[incoming.follow_up] || 'no',
      network: incoming.network
    };

    // --------------------
    // BUILD XML
    // --------------------
    let xmlFields = '';

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        xmlFields += `  <${key}>${escapeXml(value)}</${key}>\n`;
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${KOBO_FORM_ID} id="${KOBO_FORM_ID}">
${xmlFields}  <meta>
    <instanceID>${instanceID}</instanceID>
  </meta>
</${KOBO_FORM_ID}>`;

    console.log('FINAL XML:\n', xml);

    // --------------------
    // FORM DATA
    // --------------------
    const form = new FormData();

    form.append('xml_submission_file', Buffer.from(xml, 'utf-8'), {
      filename: 'submission.xml',
      contentType: 'text/xml'
    });

    if (file) {
      form.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    }

    // --------------------
    // SEND TO KOBO
    // --------------------
    const response = await fetch(KOBO_URL, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Token ${KOBO_TOKEN}`
      },
      body: form
    });

    const result = await response.text();
    console.log('Kobo response:', response.status, result);

    if (!response.ok) {
      return res.status(400).json({
        error: 'Kobo submission failed',
        detail: result
      });
    }

    res.json({
      success: true,
      instanceID,
      message: 'Submitted successfully'
    });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});