/**
 * index.js
 * Copyright (c) 2018- Aaron Angert
 * Copyright (c) 2014-2018 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Controls index.html, the main wallet Chrome popover/Firefox panel
 */

$(document).ready(function () {
    // Setup the wallet, page values and callbacks
    var val = '',
        address = '',
        opreturn = undefined,

        SATOSHIS = 100000000;
        var FEE = wallet.getFee();



  //       util.get('https://bch-insight.bitpay.com/api/utils/estimatefee').then(function (response) {
  //
  //
  // // successMessage is whatever we passed in the resolve(...) function above.
  // // It doesn't have to be a string, but if it is only a succeed message, it probably will be.
  //       FEE = JSON.parse(response)[2];
  //       });
        var BCHUnits = 'BCH',
        BCHMultiplier = SATOSHIS;


    function setupWallet() {
        wallet.restoreAddress().then(setQRCodes,
            function () {
                return wallet.generateAddress();
            }).then(setQRCodes,
            function () {
                alert('Failed to generate wallet. Refresh and try again.');
            });

        function setQRCodes() {
            $('#qrcode').html(createQRCodeCanvas(wallet.getAddress()));
            $('#textAddress').text(wallet.getAddress());
        }
    }
    wallet.setBalanceListener(function (balance) {
        setBalance(balance);
    });
    setupWallet();

    $('#amount').on('keyup change', function () {
      val = $(this).val();
        //val = Math.floor(Number($(this).val() * BCHMultiplier));
        if (val > 0) {
            currencyManager.formatBCH(val).then(function (formattedMoney) {
                var text = 'Amount: ' + formattedMoney;
                $('#amountLabel').text(text);
            });
        } else {
            $('#amountLabel').text('Amount:');
        }
    });

    function setBCHUnits(units) {
        BCHUnits = units;
        BCHMultiplier = SATOSHIS;
        // if (units === 'µBCH') {
        //     BCHMultiplier = SATOSHIS / 1000000;
        // } else if (units === 'mBCH') {
        //     BCHMultiplier = SATOSHIS / 1000;
        // } else {
        //     BCHMultiplier = SATOSHIS;
        // }

        setBalance(wallet.getBalance());
        setFee(wallet.getFee());
        // $('#sendUnit').html(BCHUnits);
        // $('#amountLabel').text('Amount:');
    }

    function setCurrencyUnits(units) {
        CurrencyUnits = units;

        // setBalance(wallet.getBalance());
        // setFee(wallet.getFee());
        $('#sendUnit').html(CurrencyUnits);
        $('#amountLabel').text('Amount:');
    }


    preferences.getBCHUnits().then(setBCHUnits);
    preferences.getCurrency().then(setCurrencyUnits);

    function setBalance(balance) {
        if (Number(balance) < 0 || isNaN(balance)) {
            balance = 0;
        }
        $('#balance').text(balance / BCHMultiplier + ' ' + BCHUnits);
        currencyManager.formatAmount(balance).then(function (formattedMoney) {
             var text =  ' (' + formattedMoney + ')';
            $('#balancemon').text(text);
        });
    }

    function setFee(fee) {
        if (Number(fee) < 0 || isNaN(fee)) {
            fee = 0;
        }
        $('#amount').attr('placeholder', '(Plus ' + fee / BCHMultiplier + ' ' + BCHUnits + ' fee)').attr('step', 100000 / BCHMultiplier).val(null);

        // $('#balance').text(balance / BCHMultiplier + ' ' + BCHUnits);
    }


    $('#successAlertClose').click(function () {
        $('#successAlert').fadeOut();
        if (typeof chrome === 'undefined') {
            addon.port.emit('resize', 278);
        }
    });

    $('#unkownErrorAlertClose').click(function () {
        $('#unknownErrorAlert').fadeOut();
    });

    if (typeof chrome === 'undefined') {
        //addon.port.on('show', setupWallet);
    }

    /*
     *  Send BCH
     */
    $('#sendButton').click(function () {
      currencyManager.BCHvalue($('#amount').val()).then(function(amount){
        val = Math.floor(Number(amount * BCHMultiplier));

        address = $('#sendAddress').val();
        opreturn = undefined;
        var balance = wallet.getBalance();
        FEE = wallet.getFee();
        var validAmount = true;
        if (val <= 0) {
            validAmount = false;
        } else if (val + FEE > balance) {
            validAmount = false;
        }
        if (validAmount) {
            $('#amountAlert').slideUp();
        } else {
            $('#amountAlert').slideDown();
        }

        var regex = /^(bitcoincash:)?(Q|P|p|q)[0-9a-zA-Z]{38,46}$/;
        var validAddress = true;
        if (!regex.test(String(address))) {
            validAddress = false;
        } else {
        try {
            if (address.indexOf("bitcoincash:") == -1){
              address = 'bitcoincash:'+address;
            }
            new bch.Address.fromString(address,'livenet', 'pubkeyhash', bch.Address.CashAddrFormat);
            //new Bitcoin.Address(address);
        } catch (e) {
            validAddress = false;
        }
        }

        if (validAddress) {
            $('#addressAlert').slideUp();
        } else {
            $('#addressAlert').slideDown();
        }

        if (validAddress && validAmount) {
            if (wallet.isEncrypted()) {
                currencyManager.formatAmount(val).then(function (formattedMoney) {
                    var text = 'Are you sure you want to send<br />' + val / BCHMultiplier + ' ' + BCHUnits + ' (<strong>' + formattedMoney + '</strong>)<br />to ' + address + ' ?';
                    $('#sendConfirmationText').html(text);
                    $('#sendConfirmationPassword').val(null);
                    $('#sendConfirmationPasswordIncorrect').hide();
                    $('#sendConfirmationModal').modal().show();
                });
            } else {
                confirmSend();
            }
        }
        });
    });

    $('#confirmSendButton').click(function () {
        confirmSend();
    });

    function confirmSend() {
        $('#cover').show();
        var password = $('#sendConfirmationPassword').val();
        wallet.send(address, val, FEE, password,undefined,opreturn).then(function () {
            $('#amount').val(null);
            $('#sendAddress').val(null);
            $('#amountLabel').text('Amount:');
            var text = 'Sent ' + val / BCHMultiplier + ' ' + BCHUnits + ' to ' + address + '.';
            $('#successAlertLabel').text(text);
            $('#successAlert').slideDown();
            $('#sendConfirmationModal').modal('hide');
            $('#cover').fadeOut('slow');
        }, function (e) {
            if (wallet.isEncrypted()) {
                $('#sendConfirmationPasswordIncorrect').text(e.message).slideDown();
            } else {
                $('#unknownErrorAlertLabel').text(e.message);
                $('#unknownErrorAlert').slideDown();
            }
            $('#cover').hide();
        });
    }

    /*
     *  Settings Menu
     */

    /*
     * Set Password
     */
    $('#setPassword').click(function () {
        $('#passwordMismatch').hide();
        $('#passwordNotLongEnough').hide();
        $('#setPasswordIncorrect').hide();
        $('#setPasswordBlank').hide();
        if (wallet.isEncrypted()) {
            $('#removePasswordDiv').show();
            $('#setPasswordPassword').show().val(null);
        } else {
        $('#removePasswordDiv').hide();
        $('#setPasswordPassword').hide().val(null);
        }
        $('#newPassword').show().val(null);
        $('#confirmNewPassword').show().val(null);
        $('#removePassword').attr('checked', false);
        $('#setPasswordModal').modal().show();
    });

    $('#removePassword').click(function () {
        if (this.checked) {
            $('#newPassword').val(null).slideUp();
            $('#confirmNewPassword').val(null).slideUp();
        } else {
            $('#newPassword').slideDown();
            $('#confirmNewPassword').slideDown();
        }
    });

    $('#confirmSetPassword').click(function () {
        var password = $('#setPasswordPassword').val(),
            newPassword = $('#newPassword').val(),
            confirmNewPassword = $('#confirmNewPassword').val();
        var validInput = true;

        if ((wallet.isEncrypted() && !password) || (!$('#removePassword').is(':checked') && (!newPassword || !confirmNewPassword))) {
            validInput = false;
            $('#setPasswordBlank').slideDown();
        } else {
            $('#setPasswordBlank').slideUp();
        }

        if (validInput && newPassword !== confirmNewPassword) {
            validInput = false;
            $('#passwordMismatch').slideDown();
        } else {
            $('#passwordMismatch').slideUp();
        }

        if (validInput && (newPassword.length <= 6 && newPassword.length > 0)){
            validInput = false;
            $('#passwordNotLongEnough').slideDown();
        } else {
            $('#passwordNotLongEnough').slideUp();
        }

        if (validInput && wallet.isEncrypted() && !wallet.validatePassword(password)) {
            validInput = false;
            $('#setPasswordIncorrect').slideDown();
        } else {
            $('#setPasswordIncorrect').slideUp();
        }

        if (validInput) {
            wallet.updatePassword(String(password), String(newPassword)).then(function () {
                $('#successAlertLabel').text('New password set.');
                $('#successAlert').show();
                $('#setPasswordModal').modal('hide');
            });
        }

    });

    /*
     * Currency selection
     */
    $('#setCurrency').click(function () {
        preferences.getCurrency().then(function (currency) {
            var currencies = currencyManager.getAvailableCurrencies();
            var tableBody = '';
            for (var i = 0; i < currencies.length/3; i++) {
                tableBody += '<tr>';
                for (var j = i; j <= i+12; j+=6) {
                    tableBody += '<td><div class="radio no-padding"><label><input type="radio" name="' + currencies[j] + '"';
                    if (currencies[j] === currency) {
                        tableBody += ' checked';
                    }
                    tableBody += '>' + currencies[j] + '</label></div></td>';
                }
                tableBody += '</tr>';
            }
            $('#tableBody').html(tableBody);
            $('#setCurrencyModal').modal().show();
            $('.radio').click(function () {
                var currency = $.trim($(this).text());
                $('input:radio[name=' + currency + ']').attr('checked', 'checked');
                preferences.setCurrency(currency).then(function () {
                    $('#amountLabel').text('Amount:');
                    $('#successAlertLabel').text('Currency set to ' + currency + '.');
                    $('#successAlert').show();
                    $('#setCurrencyModal').modal('hide');
                });
            });
        });
    });

    /*
     * Units selection
     */
    $('#setUnits').click(function () {
        preferences.getBCHUnits().then(function (units) {
            var availableUnits = ['BCH', 'mBCH', 'µBCH'];
            var tableBody = '<tr>';
            for (var i = 0; i < availableUnits.length; i++) {
                tableBody += '<td><div class="radio no-padding"><label><input type="radio" name="' + availableUnits[i] + '"';
                if (availableUnits[i] === units) {
                    tableBody += ' checked';
                }
                tableBody += '>' + availableUnits[i] + '</label></div></td>';
            }
            tableBody += '</tr>';
            $('#tableBody').html(tableBody);
            $('#setCurrencyModal').modal().show();
            $('.radio').click(function () {
                var units = $.trim($(this).text());
                $('input:radio[name=' + units + ']').attr('checked', 'checked');
                setBCHUnits(units);
                preferences.setBCHUnits(units).then(function () {
                    $('#successAlertLabel').text('Units set to ' + units + '.');
                    $('#successAlert').show();
                    $('#setCurrencyModal').modal('hide');
                });
            });
        });
    });

    /*
     *  Show Private Key
     */
    $('#showPrivateKey').click(function () {
        $('#showPrivateKeyPasswordIncorrect').hide();
        if (wallet.isEncrypted()) {
            $('#showPrivateKeyPassword').val(null).show();
        } else {
            $('#showPrivateKeyPassword').hide();
        }
        $('#privateKey').hide();
        $('#showPrivateKeyModal').modal().show();
    });

    $('#showPrivateKeyConfirm').click(function () {
        var password = $('#showPrivateKeyPassword').val();
        if (wallet.isEncrypted() && !wallet.validatePassword(password)) {
            $('#showPrivateKeyPasswordIncorrect').slideDown();
        } else {
            $('#showPrivateKeyPasswordIncorrect').slideUp();
            var privateKey = wallet.getDecryptedPrivateKey(password);
            $('#privateKeyQRCode').html(createQRCodeCanvas(privateKey));
            $('#privateKeyText').text(privateKey);
            $('#privateKey').slideDown(function () {
                $('#main').height($('#showPrivateKeyModal').find('.modal-dialog').height());
            });
        }
    });

    /*
     *  Import Private Key
     */
    $('#importPrivateKey').click(function () {
        $('#importPrivateKeyPasswordIncorrect').hide();
        $('#importPrivateKeyBadPrivateKey').hide();
        if (wallet.isEncrypted()) {
            $('#importPrivateKeyPassword').val(null).show();
        } else {
            $('#importPrivateKeyPassword').hide();
        }
        $('#importPrivateKeyPrivateKey').val(null);
        $('#importPrivateKeyModal').modal().show();
    });

    $('#importPrivateKeyConfirm').click(function () {
        var privateKey = $('#importPrivateKeyPrivateKey').val();
        try {
            new bch.PrivateKey(privateKey).toString();
            //new Bitcoin.ECKey(privateKey).getExportedPrivateKey();
        } catch (e) {
            $('#importPrivateKeyBadPrivateKey').slideDown();
            return;
        }
        wallet.importAddress($('#importPrivateKeyPassword').val(), privateKey).then(function () {
            setupWallet();
            $('#successAlertLabel').text('Private key imported successfully.');
            $('#successAlert').show();
            $('#importPrivateKeyModal').modal('hide');
        }, function (e) {
            if (e.message === 'Incorrect password') {
                $('#importPrivateKeyBadPrivateKey').slideUp();
                $('#importPrivateKeyPasswordIncorrect').slideDown();
            } else {
                $('#importPrivateKeyPasswordIncorrect').slideUp();
                $('#importPrivateKeyBadPrivateKey').slideDown();
            }
        });
    });

    /*
     *  Generate New Wallet
     */
    $('#generateNewWallet').click(function () {
        $('#generateNewWalletPasswordIncorrect').hide();
        // if (wallet.isEncrypted()) {
        //     $('#generateNewWalletPassword').show().val(null);
        // } else {
        //     $('#generateNewWalletPassword').hide();
        // }
        $('#generateNewWalletModal').modal().show();
    });

    $('#generateNewWalletConfirm').click(function () {
      wallet.removePassword();
        wallet.generateAddress($('#generateNewWalletPassword').val()).then(function () {
            setupWallet();
            $('#successAlertLabel').text('New wallet generated.');
            $('#successAlert').show();
            $('#generateNewWalletModal').modal('hide');
        }, function () {
            $('#generateNewWalletPasswordIncorrect').slideDown();
        });
    });

    /*
     * About
     */

    if (typeof chrome !== 'undefined') {
        $('#version').text(chrome.runtime.getManifest().version);
    } else {
        console.log("addon was not defined, commented out");
        // addon.port.on('version', function (version) {
        //     $('#version').text(version);
        // });
    }

    $('#aboutModal').on('click', 'a', function () {
        if (typeof chrome !== 'undefined') {
            chrome.tabs.create({url: $(this).attr('href')});
        } else {
            addon.port.emit('openTab', $(this).attr('href'));
        }
        return false;
    });




    /*
     * Post Message
     */
    $('#NeedOneField').hide();

    // $("#postContent").keyup(function(){
    //   $("#contentLabel").text("Post Content: "+$(this).val().length+"/217");
    // });

    $('#postMessage').on('click',function(){

      //make sure that only one field is filled in
      post_content = $('#postContent').val();
      change_username = $('#ChangeUsername').val();
      if ((post_content === "" && change_username === "") || (post_content !== "" && change_username !== "")){
      $('#NeedOneField').slideDown();
      return false;

    }else{

      //get code for either memo or blockpress
      var raw_op = "";
      var post_code = [];
      if (post_content !== ""){
        raw_op = post_content;
        if($('#memocheck').is(':checked')){
          post_code.push("6d024c");
        }
        if($('#blockpresscheck').is(':checked')){
          post_code.push("8d024c");
        }


      }else if(change_username !== ""){
        raw_op = change_username;
        if($('#memocheck').is(':checked')){
          post_code.push("6d014c");
        }
        if($('#blockpresscheck').is(':checked')){
          post_code.push("8d014c");
        }
      }


      address = wallet.getAddress();

      //turn text into UTF-8 encoded string, for sending in OP_RETURN
      var text_list = encodeURI(raw_op).split('%');
      var formatted_list = [];

      for (var i = 0; i < text_list[0].length; i++) {
        formatted_list.push(text_list[0].charCodeAt(i).toString(16));
      }
      text_list.shift();
      for (i = 0; i < text_list.length; i++) {
          formatted_list.push(text_list[i].slice(0,2))

            for (j = 2; j < text_list[i].length; j++){
              formatted_list.push(text_list[i][j].charCodeAt(0).toString(16))
            }

      }

      var text_len = formatted_list.length;

      val = 1000;
      FEE = wallet.getFee();
      for (var i = 0; i < post_code.length; i++) {
        var real_len = (text_len).toString(16);
        if(real_len.length === 1)
        {
          real_len = "0"+real_len;
        }
        opreturn = post_code[i] + real_len + formatted_list.join('');
        //if password show message
        if (wallet.isEncrypted()) {
            currencyManager.formatAmount(val).then(function (formattedMoney) {
                var text = 'Are you sure you want to send<br />' + val / BCHMultiplier + ' ' + BCHUnits + ' (<strong>' + formattedMoney + '</strong>)<br />to ' + address + ' ?';
                $('#sendConfirmationText').html(text);
                $('#sendConfirmationPassword').val(null);
                $('#sendConfirmationPasswordIncorrect').hide();
                $('#sendConfirmationModal').modal().show();
            });
        }else{
        confirmSend();
        }
      }
      $('#postModal').modal('hide');
      $('#NeedOneField').hide();


        }
      });

    /*
     * Resizing
     */

    $('.modal').on('shown.bs.modal', function() {
        var $main = $('#main');
        var height = $main.height();
        var modalHeight = $(this).find('.modal-dialog').height();
        if (modalHeight > height) {
            $main.height(modalHeight);
            if (typeof chrome === 'undefined') {
                addon.port.emit('resize', modalHeight+2);
            }
        }
    }).on('hidden.bs.modal', function () {
        $('#main').height('auto');
        if (typeof chrome === 'undefined') {
            if ($('#successAlert').is(':visible')) {
                var height = 350;
            } else {
                var height = 278;
            }
            addon.port.emit('resize', height);
        }
    });


    function createQRCodeCanvas(text) {
        var sizeMultiplier = 4;
        var typeNumber;
        var lengthCalculation = text.length * 8 + 12;
        if (lengthCalculation < 72) { typeNumber = 1; }
        else if (lengthCalculation < 128) { typeNumber = 2; }
        else if (lengthCalculation < 208) { typeNumber = 3; }
        else if (lengthCalculation < 288) { typeNumber = 4; }
        else if (lengthCalculation < 368) { typeNumber = 5; }
        else if (lengthCalculation < 480) { typeNumber = 6; }
        else if (lengthCalculation < 528) { typeNumber = 7; }
        else if (lengthCalculation < 688) { typeNumber = 8; }
        else if (lengthCalculation < 800) { typeNumber = 9; }
        else if (lengthCalculation < 976) { typeNumber = 10; }
        var qrcode = new QRCode(typeNumber, QRCode.ErrorCorrectLevel.H);
        qrcode.addData(text);
        qrcode.make();
        var width = qrcode.getModuleCount() * sizeMultiplier;
        var height = qrcode.getModuleCount() * sizeMultiplier;
        // create canvas element
        var canvas = document.createElement('canvas');
        var scale = 10.0;
        canvas.width = width * scale;
        canvas.height = height * scale;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        var ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        // compute tileW/tileH based on width/height
        var tileW = width / qrcode.getModuleCount();
        var tileH = height / qrcode.getModuleCount();
        // draw in the canvas
        for (var row = 0; row < qrcode.getModuleCount(); row++) {
            for (var col = 0; col < qrcode.getModuleCount(); col++) {
                ctx.fillStyle = qrcode.isDark(row, col) ? "#000000" : "#ffffff";
                ctx.fillRect(col * tileW, row * tileH, tileW, tileH);
            }
        }
        return canvas;
    }
});
