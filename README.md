Bitcoin Cash Wallet for Chrome/Firefox
=============

Bitcoin Cash wallet in the browser. Send and receive instantly on any web page.

[Chrome extension](https://chrome.google.com/webstore/detail/bitcoin-cash-wallet/oahplndhnkljjjpnlcnbkacomoepfgan?hl=en-US&gl=US)

[Firefox addon](https://addons.mozilla.org/en-US/firefox/addon/bitcoin-cash-wallet/) (still in development)

or roll your own by simply downloading this repo with the button on the right, renaming .zip to .crx and drag-and-dropping it into Chrome.

This is a forked project from Andrew Toth's Bitcoin Wallet here: https://github.com/andrewtoth/BitcoinWallet

Security
--------

The private key is stored in the browser only. Transactions are signed in the browser and are pushed to blockdozer.com. The private key will only leave the browser to be synced with other Chrome/Firefox browsers that you are signed into. Encrypting the private key ensures that nobody will know the private key without the password, not even this extension.
