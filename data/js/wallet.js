/**
 * wallet.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Wallet handles the address, private key and encryption,
 * as well as sending and determining balance
 */

(function (window) {
    var balance = 0,
        fee = 0,
        address = '',
        old_address = '',
        privateKey = '',
        isEncrypted = false,
        websocket = null,
        SATOSHIS = 100000000,
        balanceListener = null;

    var wallet = function () {};
    wallet.prototype = {

        getAddress: function () {
            return address;
        },

        getOldAddress: function () {
            return old_address;
        },

        getBalance: function () {
            return balance;
        },

        getFee: function () {
            updateFee();
            return fee;
        },

        isEncrypted: function () {
            return isEncrypted;
        },

        // Balance listener gets called with new balance whenever it updates
        setBalanceListener: function (listener) {
            balanceListener = listener;
        },

        removePassword: function(){
          // privateKey = decryptedPrivateKey;
          isEncrypted = false;
          preferences.setIsEncrypted(isEncrypted);
          // preferences.setPrivateKey(privateKey);
        },

        // Create a new address
        generateAddress: function (password) {
            return new Promise(function (resolve, reject) {
                // if (ret.validatePassword(password)) {
                    var pair = new bch.PrivateKey()
                    var privkey = pair.toString();
                    //address = privateKey.toAddress().toString();
                    //var eckey = new Bitcoin.ECKey(false);
                    if (isEncrypted) {
                        if (typeof chrome !== 'undefined') {
                            privateKey = CryptoJS.AES.encrypt(privkey, password);
                        } else {
                            privateKey = JSON.parse(CryptoJS.AES.encrypt(privkey, password, {format:jsonFormatter}));
                        }
                    } else {
                        privateKey = privkey;
                    }
                    old_address = pair.toAddress().toString();

                    address = pair.toAddress().toString(bch.Address.CashAddrFormat);
                    balance = 0;
                    Promise.all([preferences.setAddress(address), preferences.setOldAddress(old_address), preferences.setPrivateKey(privateKey), preferences.setIsEncrypted(isEncrypted)]).then(function () {
                        updateBalance();
                        updateFee();
                        resolve();
                    });
                // } else {
                //     reject(Error('Incorrect password'));
                // }
            });
        },

        // Restore the previously saved address
        restoreAddress: function () {
            return new Promise(function (resolve, reject) {
                Promise.all([preferences.getAddress(), preferences.getOldAddress(), preferences.getPrivateKey(), preferences.getIsEncrypted()]).then(function (values) {
                    if (values[0].length > 0) {
                        address = values[0];
                        old_address = values[1];
                        privateKey = values[2];
                        isEncrypted = values[3];
                        updateBalance();
                        updateFee();
                        resolve();
                    } else {
                        reject(Error('No address'));
                    }
                });
            });
        },

        // Import an address using a private key
        importAddress: function (password, _privateKey) {
            return new Promise(function (resolve, reject) {
                if (ret.validatePassword(password)) {
                    try {
                        //var eckey = new Bitcoin.ECKey(_privateKey);
                        var pair = new bch.PrivateKey(_privateKey)
                        var privkey = pair.toString();
                        if (isEncrypted) {
                            if (typeof chrome !== 'undefined') {
                                privateKey = CryptoJS.AES.encrypt(privkey, password);
                            } else {
                                privateKey = JSON.parse(CryptoJS.AES.encrypt(privkey, password, {format:jsonFormatter}));
                            }
                        } else {
                            privateKey = privkey;
                        }
                        address = pair.toAddress().toString(bch.Address.CashAddrFormat);
                        old_address = pair.toAddress().toString();
                        balance = 0;
                        Promise.all([preferences.setAddress(address),preferences.setOldAddress(old_address), preferences.setPrivateKey(privateKey), preferences.setLastBalance(0)]).then(function () {
                            updateBalance();
                            updateFee();
                            resolve();
                        });
                    } catch (e) {
                        reject(Error('Invalid private key'));
                    }
                } else {
                    reject(Error('Incorrect password'));
                }
            });
        },

        // Check if the password is valid
        validatePassword: function (password) {
            if (isEncrypted) {
                try {
                    // If we can decrypt the private key with the password, then the password is correct
                    // We never store a copy of the password anywhere
                    if (typeof chrome !== 'undefined') {
                        return CryptoJS.AES.decrypt(privateKey, password).toString(CryptoJS.enc.Utf8);
                    } else {
                        return CryptoJS.AES.decrypt(JSON.stringify(privateKey), password, {format:jsonFormatter}).toString(CryptoJS.enc.Utf8);
                    }
                } catch (e) {
                    return false;
                }
            } else {
                return true;
            }
        },

        // Return a decrypted private key using the password
        getDecryptedPrivateKey: function (password) {
            if (isEncrypted) {
                if (typeof chrome !== 'undefined') {
                    var decryptedPrivateKey = CryptoJS.AES.decrypt(privateKey, password);
                } else {
                    var decryptedPrivateKey = CryptoJS.AES.decrypt(JSON.stringify(privateKey), password, {format:jsonFormatter});
                }
                try {
                    if (!decryptedPrivateKey.toString(CryptoJS.enc.Utf8)) {
                        return null;
                    }
                } catch (e) {
                    return null;
                }
                return decryptedPrivateKey.toString(CryptoJS.enc.Utf8);
            } else {
                return privateKey;
            }
        }

    };


    function updateFee(){
      preferences.getLastFee().then(function (result) {
          fee = result;


      util.get('https://blockdozer.com/insight-api/utils/estimatefee/' + '?nocache=' + new Date().getTime()).then(function (response) {
          var json = JSON.parse(response);
          //the number of satoshis
          fee = Math.round(100000000 * json[2]);
          // json["balanceSat"] + json["unconfirmedBalanceSat"];
          return preferences.setLastFee(fee);
      })
    });
    }
    // Gets the current balance and sets up a websocket to monitor new transactions
    function updateBalance() {
        // Make sure we have an address
        if (address.length) {
            // Last stored balance is the fastest way to update
            preferences.getLastBalance().then(function (result) {
                balance = result;
                if (balanceListener) balanceListener(balance);
                // Check blockchain.info for the current balance
                //https://bitcoincash.blockexplorer.com/api/addr/
                //https://bch-insight.bitpay.com/api/addr/
                util.get('https://bitcoincash.blockexplorer.com/api/addr/' + address + '?nocache=' + new Date().getTime()).then(function (response) {
                    var json = JSON.parse(response);
                    //bitpay, only balanceSat, blockdozer and blockexplorer use both

                    balance = json["balanceSat"] + json["unconfirmedBalanceSat"];

                    return preferences.setLastBalance(balance);
                }).then(function () {
                    //web sockets currently not functional

                    // if (balanceListener) balanceListener(balance);
                    // // Close the websocket if it was still open
                    // if (websocket) {
                    //     websocket.close();
                    // }
                    //
                    //
                    //   //
                    //   //var eventToListenTo = 'tx'
                    //   //var room = 'inv'
                    //   var socket = io("https://bch-insight.bitpay.com");
                    //   socket.on('connect', function() {
                    //     // Join the room.
                    //     socket.emit('subscribe', room);
                    //     //socket.emit('subscribe', 'bitcoind/addresstxid', [ old_address ])
                    //     //socket.emit('subscribe', [ old_address ])
                    //   })
                    //   socket.on(eventToListenTo, function(data) {
                    //     console.log("New transaction received: ");
                    //     console.log(data);
                    //
                    //   })




                      //socket.on('bitcoind/addresstxid', data => console.log('new address data:', data))
                      //socket.on('connect', () => socket.emit('subscribe', 'bitcoind/addresstxid', [ 'my_address_here' ]))

                    // Create a new websocket to blockchain.info
                    // webSocket = new WebSocket("https://blockdozer.com/socket.io/1/")
                    //websocket = new WebSocket("ws://ws.blockchain.info:8335/inv");

                    // websocket.onopen = function() {
                    //     // Tell the websocket we want to monitor the address
                    //     websocket.send('{"op":"addr_sub", "addr":"' + old_address + '"}');
                    // };
                    // websocket.onmessage = function (evt) {
                    //     // Parse the new transaction
                    //     var json = JSON.parse(evt.data);
                    //     var inputs = json.x.inputs;
                    //     var outputs = json.x.out;
                    //     var i;
                    //     // Subtract all inputs from the balance
                    //     for (i = 0; i < inputs.length; i++) {
                    //         var input = inputs[i].prev_out;
                    //         if (input.addr === address) {
                    //             balance = Number(balance) - Number(input.value);
                    //         }
                    //     }
                    //     // Add all output to the balance
                    //     for (i = 0; i < outputs.length; i++) {
                    //         var output = outputs[i];
                    //         if (output.addr === address) {
                    //             balance = Number(balance) + Number(output.value);
                    //         }
                    //     }
                    //     // Save the new balance and notify the listener
                    //     preferences.setLastBalance(balance).then(function () {
                    //         if (balanceListener) balanceListener(balance);
                    //     });
                    // };



                });
            });
        }
    }

    var ret = new wallet();

    // Change the password to a new password
    wallet.prototype.updatePassword = function (password, newPassword) {
        return new Promise(function (resolve, reject) {
            // Make sure the previous password is correct
            var decryptedPrivateKey = ret.getDecryptedPrivateKey(password);
            if (decryptedPrivateKey) {
                // If we have a new password we use it, otherwise leave cleartext
                if (newPassword) {
                    if (typeof chrome !== 'undefined') {
                        privateKey = CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword);
                    } else {
                        privateKey = JSON.parse(CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword, {format:jsonFormatter}));
                    }
                    isEncrypted = true;
                } else {
                    privateKey = decryptedPrivateKey;
                    isEncrypted = false;
                }
                // Save the encrypted private key
                // Passwords are never saved anywhere
                Promise.all([preferences.setIsEncrypted(isEncrypted), preferences.setPrivateKey(privateKey)]).then(resolve);
            } else {
                reject(Error('Incorrect password'));
            }
        });
    };



    // wallet.prototype.removePassword = function () {
    //     return new Promise(function (resolve, reject) {
    //         // Make sure the previous password is correct
    //         // var decryptedPrivateKey = ret.getDecryptedPrivateKey(password);
    //         // if (decryptedPrivateKey) {
    //             // If we have a new password we use it, otherwise leave cleartext
    //             // if (newPassword) {
    //             //     if (typeof chrome !== 'undefined') {
    //             //         privateKey = CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword);
    //             //     } else {
    //             //         privateKey = JSON.parse(CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword, {format:jsonFormatter}));
    //             //     }
    //             //     isEncrypted = true;
    //             // } else {
    //                 privateKey = decryptedPrivateKey;
    //                 isEncrypted = false;
    //             // }
    //             // Save the encrypted private key
    //             // Passwords are never saved anywhere
    //             Promise.all([preferences.setIsEncrypted(isEncrypted), preferences.setPrivateKey(privateKey)]).then(resolve);
    //         // } else {
    //         //     reject(Error('Incorrect password'));
    //         // }
    //     });
    // };

    // function get_new_address(old){
    //   return old;
    // }
    // Send bitcoin from the wallet to another address
    wallet.prototype.send = function (sendAddress, amount, fee, password, bitpay_url) {
        return new Promise(function (resolve, reject) {
            var decryptedPrivateKey = ret.getDecryptedPrivateKey(password);
            if (decryptedPrivateKey) {
                // Get all unspent outputs from blockchain.info to generate our inputs
                //https://bch-insight.bitpay.com/api/addr/
                //https://blockdozer.com/insight-api/addr/
                util.getJSON('https://bitcoincash.blockexplorer.com/api/addr/' + address+'/utxo?nocache='+ new Date().getTime()).then(function (json) {
                    var inputs = json,
                        selectedOuts = [];
                        //eckey = new Bitcoin.ECKey(decryptedPrivateKey),
                        // Total cost is amount plus fee
                        var totalInt = Number(amount) + Number(fee);
                        var txValue = new bigInt('' + totalInt, 10);

                        var availableValue = bigInt.zero;

                        var utxos = [];
                    // Gather enough inputs so that their value is greater than or equal to the total cost
                      var new_utxo = false;
                      var multi_utxo = false;

                      //only use when utxo set doesn't update immediately
                    // for (var i = 0; i < inputs.length; i++) {
                    //     if(inputs[i].confirmations === 0){
                    //       if(new_utxo === false){
                    //       new_utxo = true;
                    //         }else{
                    //           multi_utxo = true;
                    //         }
                    //     }
                    //   }


                    for (var i = 0; i < inputs.length; i++) {
                      //make sure to set to > 0, if utxo set doesn't update automatically
                        if((new_utxo === false && inputs[i].confirmations >= 0) || (new_utxo && inputs[i].confirmations === 0)){
                          selectedOuts.push(inputs[i]);
                          availableValue = availableValue.add(new bigInt('' + inputs[i].satoshis, 10));

                          // If we ever need to switch to the new address
                          var new_address = '';
                          if (inputs[i].address.indexOf("bitcoincash:") == -1){
                            new_address = 'bitcoincash:'+inputs[i].address;
                          }else{
                            new_address = inputs[i].address;
                          }

                          legacy_utxo_address = bch.Address.fromString(new_address,'livenet','pubkeyhash',bch.Address.CashAddrFormat).toString();

                          //inputs[i].address

                          var utxo = {
                          'txId' : inputs[i].txid,
                          'outputIndex' : inputs[i].vout,
                          'address' : legacy_utxo_address,
                          'script' : inputs[i].scriptPubKey,
                          'satoshis' : inputs[i].satoshis
                        };
                          console.log(utxo);
                          utxos.push(utxo);
                          if (availableValue.compareTo(txValue) >= 0) break;

                      }
                      //If there are 0 conf transactions, only use the first one found
                      if(new_utxo) break;

                    }
                    // If there aren't enough unspent outputs to available then we can't send the transaction
                    // console.log("new utxo is ");
                    // console.log(new_utxo);
                    // console.log(availableValue.compareTo(txValue));
                    if (multi_utxo){
                      reject(Error('wait for confirmations'));
                    }else if (new_utxo && availableValue.compareTo(txValue) < 0) {
                        reject(Error('wait for confirmations'));
                    } else if (availableValue.compareTo(txValue) < 0) {
                        reject(Error('Insufficient funds'));
                    } else {
                        // Create the transaction
                        //var sendTx = new Bitcoin.Transaction();

                        var legacy_address = bch.Address.fromString(address,'livenet','pubkeyhash',bch.Address.CashAddrFormat).toString();
                        var legacy_sendaddress = bch.Address.fromString(sendAddress,'livenet','pubkeyhash',bch.Address.CashAddrFormat).toString();
                        var transaction = new bch.Transaction()
                          .from(utxos) // using the last UXTO to sign the next transaction
                          .to(legacy_sendaddress, Number(amount)) // Send 10000 Satoshi's
                          .fee(Number(fee))
                          .change(legacy_address)
                          .sign(decryptedPrivateKey);


                        // Add all our unspent outputs to the transaction as the inputs
                        // for (i = 0; i < selectedOuts.length; i++) {
                        //     var hash = Crypto.util.bytesToBase64(Crypto.util.hexToBytes(selectedOuts[i].tx_hash));
                        //     var script = new Bitcoin.Script(Crypto.util.hexToBytes(selectedOuts[i].script));
                        //     var txin = new Bitcoin.TransactionIn({
                        //         outpoint: {
                        //             hash: hash,
                        //             index: selectedOuts[i].tx_output_n
                        //         },
                        //         script: script,
                        //         sequence: 4294967295
                        //     });
                        //     sendTx.addInput(txin);
                        // }
                        // // Add the send address to the transaction as the output
                        // sendTx.addOutput(new Bitcoin.Address(sendAddress), new BigInteger('' + amount, 10));
                        // // Add any leftover value to the transaction as an output pointing back to this wallet,
                        // // minus the fee of course
                        // var changeValue = availableValue.subtract(txValue);
                        // if (changeValue.compareTo(BigInteger.ZERO) > 0) {
                        //     sendTx.addOutput(eckey.getBitcoinAddress(), changeValue);
                        // }
                        // // Sign all the input hashes
                        // var hashType = 1; // SIGHASH_ALL
                        // for (i = 0; i < sendTx.ins.length; i++) {
                        //     var connectedScript = sendTx.ins[i].script;
                        //     hash = sendTx.hashTransactionForSignature(connectedScript, i, hashType);
                        //     var signature = eckey.sign(hash);
                        //     signature.push(parseInt(hashType, 10));
                        //     var pubKey = eckey.getPub();
                        //     script = new Bitcoin.Script();
                        //     script.writeBytes(signature);
                        //     script.writeBytes(pubKey);
                        //     sendTx.ins[i].script = script;
                        // }
                        // // Push the transaction to blockchain.info

                      //  var data = 'tx=' + Crypto.util.bytesToHex(sendTx.serialize());

                      if (typeof bitpay_url != 'undefined'){
                        var data = JSON.stringify({'currency':'BCH','transactions': [transaction.toString()]});
                        //var data = 'rawtx='+ transaction.toString();
                        //var insight = new explorer.Insight('https://bch-insight.bitpay.com');
                        console.log(transaction.toString());
                        console.log(data);
                        var headers = {'Content-Type':'application/payment'}
                        util.postHeaders(bitpay_url, data, headers).then(function (response) {
                          console.log(response);
                           resolve();
                        }, function (response) {
                          console.log(response);
                           reject(Error('Unknown error'));
                        });


                      }else {

                         var data = JSON.stringify({'rawtx': transaction.toString()});
                        //var data = 'rawtx='+ transaction.toString();
                        //var insight = new explorer.Insight('https://bch-insight.bitpay.com');
                        console.log(transaction.toString());
                        console.log(data);
                        headers = {'Content-type': 'application/json'};
                        //https://blockdozer.com/insight-api/tx/send
                        util.postHeaders('https://bitcoincash.blockexplorer.com/api/tx/send', data, headers).then(function () {
                            // Notify the balance listener of the changed amount immediately,
                            // but don't set the balance since the transaction will be processed by the websocket
                            //if (balanceListener) balanceListener(balance - amount - fee);
                            resolve();
                        }, function () {
                            reject(Error('Unknown error'));
                        });
                      }


                    }
                }, function () {
                    reject(Error('Unknown error'));
                });
            } else {
                reject(Error('Incorrect password'));
            }
        });
    };

    var jsonFormatter = {
        stringify: function (cipherParams) {
            // create json object with ciphertext
            var jsonObj = {
                ct: cipherParams.ciphertext.toString(CryptoJS.enc.Hex)
            };

            // optionally add iv and salt
            if (cipherParams.iv) {
                jsonObj.iv = cipherParams.iv.toString();
            }
            if (cipherParams.salt) {
                jsonObj.s = cipherParams.salt.toString();
            }

            // stringify json object
            return JSON.stringify(jsonObj);
        },

        parse: function (jsonStr) {
            // parse json string
            var jsonObj = JSON.parse(jsonStr);

            // extract ciphertext from json object, and create cipher params object
            var cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Hex.parse(jsonObj.ct)
            });

            // optionally extract iv and salt
            if (jsonObj.iv) {
                cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
            }
            if (jsonObj.s) {
                cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
            }

            return cipherParams;
        }
    };

    window.wallet = ret;
})(window);
