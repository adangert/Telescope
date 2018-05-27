/**
 * util.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Utility methods
 */

(function (window) {

    var util = function () {},
        // Promisified ajax request
        request = function (url, type, data, headers) {
            return new Promise(function (resolve, reject) {
                var req = new XMLHttpRequest();
                //req.setRequestHeader('Cache-Control', 'no-cache');
                req.open((type ? type : 'GET'), url, true);
                // req.setRequestHeader('cache-control', 'no-cache, must-revalidate, post-check=0, pre-check=0');

                req.setRequestHeader('Cache-Control', 'private');
                req.setRequestHeader('Cache-Control','max-age=0');
                req.setRequestHeader('Cache-Control','no-store');
                req.setRequestHeader('Cache-Control','no-cache');
                req.setRequestHeader('Expires', '0');
                // req.setRequestHeader('expires', 'Tue, 01 Jan 1980 1:00:00 GMT');
                req.setRequestHeader('Pragma', 'no-cache');
                req.onload = function () {
                    if (req.status == 200) {
                        resolve(req.response);
                    } else {
                        reject(Error(req.statusText));
                    }
                }
                req.onerror = function () {
                    reject(Error('Network error'));
                }
                for (var key in headers) {
                    if (headers.hasOwnProperty(key)) {
                        req.setRequestHeader(key, headers[key]);
                    }
                }
                req.send(data);
            });
        };

    util.prototype = {
        getJSON: function (url) {
            if (typeof chrome !== 'undefined') {
                return request(url).then(JSON.parse);
            } else {
                return ret.message('getJSON', url);
            }
        },

        getHeaders: function(url,headers){
          if (typeof chrome !== 'undefined') {
              return request(url, 'GET', {}, headers);
          } else {
              return ret.message('get', {}, {url:url, content:headers});
          }
        },

        get: function (url) {
            return request(url);
        },

        post: function (url, data) {
            if (typeof chrome !== 'undefined') {
                return request(url, 'POST', data, {});
            } else {
                return ret.message('post', {url:url, content:data});
            }
        },

        postHeaders: function (url, data, headers) {
            if (typeof chrome !== 'undefined') {
                return request(url, 'POST', data, headers);
            } else {
                return ret.message('post', {url:url, content:data}, headers);
            }
        },

        // Used to send messages from content scripts to add-on scripts and return values to content scripts in Firefox add-on
        message: function (name, value) {
            return new Promise(function (resolve) {
                // 'self' can also be 'addon' depending on how script is injected
                var ref = (typeof addon === 'undefined' ? self : addon);
                ref.port.on(name, resolve);
                ref.port.emit(name, value);
            });
        }
    };

    var ret = new util();

    // Different workarounds to inject content into iFrames for Chrome and Firefox
    util.prototype.iframe = function (src) {
        return new Promise(function (resolve) {
            var iframe = document.createElement('iframe');
            document.body.appendChild(iframe);
            iframe.setAttribute('style', 'background-color: transparent; position: absolute; z-index: 2147483647; border: 0px;');
            iframe.setAttribute('allowtransparency', 'true');
            iframe.frameBorder = '0';


            if (navigator.userAgent.indexOf("Chrome") != -1) {
                // For Chrome get the HTML content with an ajax call and write it into the document
                iframe.src = 'about:blank';
                var request = new XMLHttpRequest();
                request.open('GET', chrome.extension.getURL('data/' + src), false);
                request.send(null);
                var text = request.response;
                // Replace css relative locations with absolute locations since Chrome won't find relative
                text = text.replace(/css\//g, chrome.extension.getURL('') + 'data/css/');
                iframe.contentWindow.document.open('text/html', 'replace');
                iframe.contentWindow.document.write(text);
                iframe.contentWindow.document.close();


                resolve(iframe);
            } else {

                var fullURL = browser.extension.getURL("data/"+src);
                iframe.src = fullURL;
                var request = new XMLHttpRequest();
                request.open('GET', chrome.extension.getURL('data/' + src), false);
                request.send(null);
                var text = request.response;
                text = text.replace(/css\//g, chrome.extension.getURL('') + 'data/css/');
                console.log(iframe.contentWindow.document.getElementById('progress'));
                // resolve(iframe);
                setTimeout(function(){
                    resolve(iframe);
                }, 100);

                // // For Firefox get the encoded HTML and set it to the iFrame's src
                // iframe.src = 'moz-extension://ff3b317a-b2d5-4e7b-acee-c90f0ad9b174/data/paypopup.html';
                // ret.message('html', fullURL).then(function (url) {
                //     // iframe.src = fullURL;
                //     // Only way to reliably know when the frame is ready in Firefox is by polling
                //     function pollReady() {
                //         if (!iframe.contentWindow.document.getElementById('progress')) {
                //             setTimeout(pollReady, 5);
                //         } else {
                //             resolve(iframe);
                //         }
                //     }
                //     pollReady();
                // });
            }
        });
    }

    window.util = ret;

})(window);
