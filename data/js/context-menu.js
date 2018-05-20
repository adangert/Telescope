/**
 * context-menu.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Context menu event listeners for Firefox add-on
 */

(function () {

    var address = null,
        rect = null;

    // Event received before context menu is rendered
    self.on('context', function (node) {
        address = null;
        rect = null;
        // Send null address to reset label to 'Send BCH'
        self.postMessage({address:address});
        // If we're a text node we check if it contains a bitcoin address
        if (node.children.length == 0 && node['textContent']) {
            var text = node['textContent'];
            var matches = text.match(/(bitcoincash:)?q[0-9a-z]{38,46}/);
            if (matches) {
                try {
                    address = '';
                    if (matches[0].indexOf("bitcoincash:") == -1){
                      address = 'bitcoincash:'+matches[0];
                    }else{
                      address = matches[0];
                    }

                    new bch.Address.fromString(address,'livenet', 'pubkeyhash', bch.Address.CashAddrFormat);
                    //new Bitcoin.Address(matches[0]);
                    // If we get here we have a valid bitcoin address somewhere in the right clicked node
                    //address = matches[0];
                    // Sending the address back changes text to 'Pay <address>'
                    self.postMessage({address:address});
                    // Wrap address with a unique span so we can determine the exact position
                    text = text.replace(address, '<span id="bitcoin-address-' + address + '">' + address + '</span>');
                    var replacementNode = document.createElement('span');
                    var sanitized_text  = sanitizeHtml(text,{
                      allowedTags: ['span', 'a' ],
                      allowedSchemes: [ 'bitcoincash' ],
                      allowedAttributes: {
                        'a': [ 'href' ],
                        'span': ['class']
                      }
                    });
                    replacementNode.innerHTML = sanitized_text;
                    node.parentNode.insertBefore(replacementNode, node);
                    node.parentNode.removeChild(node);
                    // Get the rect of the address
                    rect = document.getElementById('bitcoin-address-' + address).getBoundingClientRect();
                    // Put everything back to where it was
                    replacementNode.parentNode.insertBefore(node, replacementNode);
                    replacementNode.parentNode.removeChild(replacementNode);
                } catch (e) {}
            }
        }
        // Return true will always show the item in the context menu
        return true;
    });

    // Event received when the context menu item is clicked
    self.on('click', function () {
        var object = {clicked:true, address:address};
        // If an address was clicked, rect will be the position of the address so send it
        if (rect) {
            object.left = rect.left;
            object.right = rect.right;
            object.top = rect.top;
            object.bottom = rect.bottom;
        }
        self.postMessage(object);
    });

})();
