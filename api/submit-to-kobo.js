const fetch = require('node-fetch');
const FormData = require('form-data');
const crypto = require('crypto');

const KOBO_FORM_ID = 'aNZHBjwUHgTJUUSbZuEhFd';
const KOBO_TOKEN = process.env.KOBO_TOKEN;
const KOBO_URL = 'https://kc.kobotoolbox.org/submission';

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let incoming = JSON.parse(req.body.data || '{}');
    const file = req.files?.[0];
    const escapeXml = (unsafe = '') =>
      String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    const instanceID = `uuid:${crypto.randomUUID()}`;
    let gps = incoming.gps || '';
    if (gps.includes(',')) {
      gps = gps.replace(',', ' ') + ' 0 0';
    }
    let outcomesValue = incoming.outcomes || incoming.outcome;
    if (Array.isArray(outcomesValue)) {
      outcomesValue = outcomesValue
        .map(o => MAP.outcomes[o])
        .filter(Boolean)
        .join(' ');
    } else {
      outcomesValue = MAP.outcomes[outcomesValue] || '';
    }
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
    let xmlFields = '';
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        xmlFields += `  <${key}>${escapeXml(value)}</${key}>\n`;
      }
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${KOBO_FORM_ID} id="${KOBO_FORM_ID}">\n${xmlFields}  <meta>\n    <instanceID>${instanceID}</instanceID>\n  </meta>\n</${KOBO_FORM_ID}>`;
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
    const response = await fetch(KOBO_URL, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Token ${KOBO_TOKEN}`
      },
      body: form
    });
    const result = await response.text();
    if (!response.ok) {
      return res.status(400).json({ error: 'Kobo submission failed', detail: result });
    }
    res.json({ success: true, message: 'Submitted successfully', instanceID, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
