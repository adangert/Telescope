/**
 * main.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Main file for Firefox add-on
 */

(function () {
    var self = require('sdk/self'),
        data = self.data

    // Create the wallet panel
    var walletPanel = require('sdk/panel').Panel({
        width:762,
        //width:362,
        height:278,
        //height:578,
        contentURL: data.url('index.html'),
        onShow: function () {
            walletPanel.port.emit('show');
            walletPanel.port.emit('version', self.version);
        }
    });
    addListeners(walletPanel);

    walletPanel.port.on('resize', function (height) {
        walletPanel.resize(walletPanel.width, height);
    });

    // Attach the wallet to the bitcoin button
    require('sdk/widget').Widget({
        id: 'open-wallet-btn',
        label: 'Bitcoin Wallet',
        contentURL: data.url('bitcoin38.png'),
        panel: walletPanel
    });

    // Inject the hover popup scripts into every page
    require('sdk/page-mod').PageMod({
        include: '*',
        contentScriptFile: [
            data.url('js/libs/promise.min.js'),
            data.url('js/libs/jquery.min.js'),
            data.url('js/libs/bitcoincash-0-1.10.min.js'),
            data.url('js/libs/socket.io.js'),
            data.url('js/util.js'),
            data.url('js/preferences.js'),
            data.url('js/currency-manager.js'),
            data.url('js/hoverpopup.js')],
        onAttach: function (worker) {
            addListeners(worker);
        }
    });

    var tabs = require('sdk/tabs');

    // Add listeners to the worker to communicate with scripts
    function addListeners(worker) {
        // Get prefs from storage
        worker.port.on('get', function () {
            var storage = require('sdk/simple-storage').storage;
            worker.port.emit('get', storage);
        });

        // Save prefs to storage
        worker.port.on('save', function (object) {
            var storage = require('sdk/simple-storage').storage;
            for (var i in object) {
                storage[i] = object[i];
            }
            worker.port.emit('save', storage);
        });

        // Open tabs
        worker.port.on('openTab', function (url) {
            tabs.open(url);
        });

        // Get HTML for local files
        worker.port.on('html', function (url) {
            let content = data.load(url);
            // Replace relative paths of css files to absolute path
            content = content.replace(/css\//g, data.url('css/'));
            content = encodeURIComponent(content);
            content = 'data:text/html;charset=utf-8,' + content;
            worker.port.emit('html', content);
        });

        // Cross-domain XHRs
        worker.port.on('getJSON', function (url) {
            require("sdk/request").Request({
                url: url,
                onComplete: function (response) {
                    worker.port.emit('getJSON', response.json);
                }
            }).get();
        });

        worker.port.on('post', function (message) {
            require("sdk/request").Request({
                url: message.url,
                content: message.content,
                onComplete: function (response) {
                    worker.port.emit('post', response);
                }
            }).post();
        });
    }

    var workers = {};

    // Inject pay popup scripts into every page
    tabs.on('ready', function (tab) {
        workers[tab.id] = tab.attach({
            contentScriptFile: [
                data.url('js/libs/promise.min.js'),
                data.url('js/libs/jquery.min.js'),
                data.url('js/libs/cryptojs.min.js'),
                data.url('js/libs/bitcoincash-0.1.10.min.js'),
                data.url('js/libs/socket.io.js'),
                data.url('js/util.js'),
                data.url('js/preferences.js'),
                data.url('js/currency-manager.js'),
                data.url('js/wallet.js'),
                data.url('js/paypopup.js')]
        });
        addListeners(workers[tab.id]);
    });


    var cm = require('sdk/context-menu');

    // Create the context menu and inject the scripts to control it
    cm.Item({
        label: 'Send BCH',
        image: data.url('bitcoin38.png'),
        context: cm.SelectorContext('*'),
        contentScriptFile: [
            data.url('js/libs/bitcoincash-0.1.10.min.js'),
            data.url('js/context-menu.js')
        ],
        onMessage: function (message) {
            console.log("doing the function message");
            if (message.address === null) {
                this.label = 'Send BCH';
            } else if (typeof message.address === 'string') {
                this.label = 'Pay ' + message.address;
            }
            if (message.clicked) {
                var worker = workers[tabs.activeTab.id];
                worker.port.emit('pay', message);
            }
        }
    });

})();
