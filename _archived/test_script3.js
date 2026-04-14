const crypto = require('crypto');
async function testKobo(id) {
  const xml = `<?xml version='1.0'?><aNZHBjwUHgTJUUSbZuEhFd id='${id}'><dcc_name>James Test</dcc_name><meta><instanceID>uuid:${crypto.randomUUID()}</instanceID></meta></aNZHBjwUHgTJUUSbZuEhFd>`;
  const fd = new FormData();
  fd.append('xml_submission_file', new Blob([xml], {type: 'text/xml'}), 'submission.xml');
  try {
    const res = await fetch('https://kc.kobotoolbox.org/danieluganda/submission', {
      method: 'POST',
      headers: { 'Authorization': 'Token 070760df54724dec37f37cef0c2f572e184af535' },
      body: fd
    });
    console.log(`id=${id}:`, res.status, await res.text());
  } catch(e) { console.error(e) }
}
async function run() {
  await testKobo("aNZHBjwUHgTJUUSbZuEhFd");
  await testKobo("evidence_tracking");
}
run();
