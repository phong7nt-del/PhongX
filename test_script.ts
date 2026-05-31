import fetch from 'node-fetch';
async function test() {
  const payload = {
    action: 'updateLinkDL',
    spreadsheetId: '1ORxFm7PvaDSRvSoNCC5ksBKjk9BEwEfrrOkGIapl9H4',
    maDV: 'PE01',
    newLink: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
  };
  const payload18 = {
    action: 'updateLinkDL',
    spreadsheetId: '1ORxFm7PvaDSRvSoNCC5ksBKjk9BEwEfrrOkGIapl9H4',
    maDV: 'PE18',
    newLink: 'https://docs.google.com/spreadsheets/d/1ORxFm7PvaDSRvSoNCC5ksBKjk9BEwEfrrOkGIapl9H4/edit'
  };
  let res = await fetch('https://script.google.com/macros/s/AKfycbzZ3rQEeTbwrTL_nDMYY2GETD_UVLQGtp5Cwv2m1sWcZQq0aeG47qTcg4A0-3BvBPl1/exec', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  console.log('Result 1:', await res.text());
  
  res = await fetch('https://script.google.com/macros/s/AKfycbzZ3rQEeTbwrTL_nDMYY2GETD_UVLQGtp5Cwv2m1sWcZQq0aeG47qTcg4A0-3BvBPl1/exec', {
    method: 'POST',
    body: JSON.stringify(payload18)
  });
  console.log('Result 2:', await res.text());
}
test();
