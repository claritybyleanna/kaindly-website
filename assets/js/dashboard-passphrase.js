const params = new URLSearchParams(location.search);
const target = params.get('returnTo');
if (target && /^\/dashboard\/(?:[a-z0-9-]+\/)*(?:\?[^#]*)?$/i.test(target)) document.querySelector('#passphrase-return').value = target;
if(params.has('error')) document.querySelector('#passphrase-status').textContent = 'Access was not granted. Check your passphrase or wait 15 minutes after repeated attempts.';
