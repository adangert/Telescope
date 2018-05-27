/**
 * hoverpopup.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Controls hoverpopup.html, the popup that appears hovering over addresses
 */
//window.onload = function () { alert("It's loaded!") }

$(document).ready(function () {
    // Recursively walk through the childs, and push text nodes in the list
    //console.log("walking through everything")
    var textNodes = [];
    (function recursiveWalk(node) {
        if (node) {
            node = node.firstChild;
            while (node != null) {
                if (node.nodeType == 3) {
                    textNodes.push(node);
                } else if (node.nodeType == 1) {
                    recursiveWalk(node);
                }
                node = node.nextSibling;
            }
        }
    })(document.body);

    // Check all text nodes for addresses
    for (var i = textNodes.length-1; i>=0; i--) {
        var matches = textNodes[i]['textContent'].match(/(bitcoincash:)?(Q|P|p|q)[0-9a-zA-Z]{38,46}/g);
        if (matches) {
            var text = textNodes[i]['textContent'],
                hasMatch = false;
            for (var j = 0; j < matches.length; j++) {
                try {
                    var new_address = '';
                    if (matches[j].indexOf("bitcoincash:") == -1){
                      new_address = 'bitcoincash:'+matches[j];
                    }else{
                      new_address = matches[j];
                    }

                    new bch.Address.fromString(new_address,'livenet', 'pubkeyhash', bch.Address.CashAddrFormat);
                    //new Bitcoin.Address(matches[j]);
                    // If we're here, then this node has a valid address
                    hasMatch = true;
                    // Wrap the address in the 'bitcoin-address' class
                    //text = text.replace(matches[j], '<span class="bitcoin-address">' + matches[j] + '</span>');
                    text = text.replace(matches[j], '<span class="bitcoin-address"><a href="'+matches[j]+'">' + matches[j] + '</a></span>');
                    //text = text.replace(matches[j], 'oooompa');
                } catch (e) {}
            }
            if (hasMatch) {
                // Replace the node with the wrapped bitcoin addresses HTML
                var replacementNode = document.createElement('span'),
                    node = textNodes[i];
                //this wraps bitcoin cash addresses with hrefs
                //i.e. in the above comment:
                //<span class="bitcoin-address"><a href="'+matches[j]+'">' + matches[j] + '</a></span>
                var sanitized_text  = sanitizeHtml(text,{
                  allowedTags: ['span', 'a' ],
                  allowedSchemes: [ 'bitcoincash' ],
                  allowedAttributes: {
                    'a': [ 'href' ],
                    'span': ['class']
                  }
                });
              //console.log(sanitized_text);

                replacementNode.innerHTML = sanitized_text;
                node.parentNode.insertBefore(replacementNode, node);
                node.parentNode.removeChild(node);
            }
        }
    }

    // We only want to open the popup once per address to not annoy the user,
    // so cache the addresses
    var openPopups = {};
    // Open the address when we hover on a 'bitcoin-address' wrapped element
    // $('.bitcoin-address').hover(function () {
    //     var address = $(this).text();
    //     if (address.indexOf("bitcoincash:") == -1){
    //       address = 'bitcoincash:'+address;
    //     }
    //     var rect = this.getBoundingClientRect();
    //     if (!openPopups[address]) {
    //         // Cache the address
    //         openPopups[address] = {};
    //         util.iframe('hoverpopup.html').then(function (iframe) {
    //             var height = 66;
    //             iframe.style.height = height + 'px';
    //             iframe.style.width = '240px';
    //             iframe.style.left = Number(rect.left) + Number(window.pageXOffset) + Number(rect.right - rect.left)/2 - 105 + 'px';
    //             iframe.style.top = Number(rect.top) + Number(window.pageYOffset) - height + 'px';
    //             var $iframe = $(iframe.contentWindow.document);
    //             $iframe.find('#main').fadeIn('fast');
    //             util.getJSON('https://blockdozer.com/insight-api/addr/' + address + '?nocache='+ new Date().getTime()).then(function (json) {
    //                 return Promise.all([currencyManager.formatAmount(json.totalReceivedSat), currencyManager.formatAmount(json.balanceSat)]);
    //             }).then(function (amounts) {
    //                 $iframe.find('#progress').fadeOut('fast', function () {
    //                     $iframe.find('#received').fadeIn('fast').html('Total received: <span class="float-right">' + amounts[0] + '</span>');
    //                     $iframe.find('#balance').fadeIn('fast').html('Final balance: <span class="float-right">' + amounts[1] + '</span>');
    //                 });
    //             });
    //             $iframe.find('#infoButton').click(function () {
    //                 // Different APIs to open tabs in Chrome and Firefox
    //                 if (typeof chrome !== 'undefined') {
    //                     chrome.runtime.sendMessage({address: address})
    //                 } else {
    //                     self.port.emit('openTab', 'https://bch-insight.bitpay.com/address/' + address);
    //                 }
    //             });
    //             $iframe.find('#closeButton').click(function () {
    //                 $(iframe).fadeOut('fast', function () {
    //                     $(this).remove();
    //                 });
    //             });
    //         });
    //     }
    // });

});
