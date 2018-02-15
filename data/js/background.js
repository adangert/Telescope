/**
 * background.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 *  Background script for Chrome extension
 */

(function () {

    // Save port to communicate with content scripts
    var responsePort = null;
    chrome.runtime.onConnect.addListener(function(port) {
        console.log("onConnect listener");
        responsePort = port;
    });

    // Create context menus
    chrome.contextMenus.create({'title': 'Pay %s', 'contexts': ['selection'], 'onclick': menuOnClick});
    chrome.contextMenus.create({'title': 'Send BCH', 'contexts': ['page'], 'onclick': menuOnClick});
    function menuOnClick(info) {
        console.log(info);
        if (info.selectionText) {
            responsePort.postMessage({'address': info.selectionText});
        } else {
            responsePort.postMessage({});
        }
    };

    // Open new tabs
    chrome.runtime.onMessage.addListener(function (request) {
        if (request.address) {
            console.log("request address");
            chrome.tabs.create({url: 'https://blockdozer.com/insight/address/' + request.address});
        }
    });

})();
