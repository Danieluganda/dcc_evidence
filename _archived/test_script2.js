const xml = `<?xml version='1.0'?><aNZHBjwUHgTJUUSbZuEhFd id='evidence_tracking'><dcc_name>James Test</dcc_name><meta><instanceID>uuid:${crypto.randomUUID()}</instanceID></meta></aNZHBjwUHgTJUUSbZuEhFd>`;
const fd = new FormData();
fd.append('xml_submission_file', new Blob([xml], {type: 'text/xml'}), 'submission.xml');
fetch('https://kc.kobotoolbox.org/danieluganda/submission', {
  method: 'POST',
  headers: { 'Authorization': 'Token 070760df54724dec37f37cef0c2f572e184af535' },
  body: fd
}).then(r => r.text()).then(console.log).catch(console.log);
