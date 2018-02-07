BitBrowser Bitcoin Wallet
=============

Bitcoin wallet in the browser. Send and receive instantly on any web page.

Check out a video demonstration <a href="http://www.youtube.com/watch?v=DfoyuBTudDs">here</a>. Screenshots <a href="http://imgur.com/a/rMvdO">here</a>.

You can download the extension <a href="https://chrome.google.com/webstore/detail/bitcoin-wallet/mjjfjonhlkajifgkcmmgadaimemcihcj">here</a>, or roll your own by simply downloading this repo with the button on the right, renaming .zip to .crx and drag-and-dropping it into Chrome.

Security
--------

The private key is stored in the browser only. Transactions are signed in the browser and are pushed to blockchain.info. The private key will only leave the browser to be synced with other Chrome browsers that you are signed into. Encrypting the private key ensures that nobody will know the private key without the password, not even this extension.
