var appConfig = require('./appConfig/config.json');
var path = require('path');
var fs = require('fs');
var moment = require('moment');
var db = require('./database/mongodb.js');

var tokenFileName = appConfig.tokenFile;
var TOKEN_TYPE = appConfig.storeTokenType;
var logger = require('./common/logger/logger').logger;

var TOKEN_DIR = path.join(__dirname, appConfig.tokenPath);
var TOKEN_PATH = TOKEN_DIR + tokenFileName;

function storeToken(token, refreshToken, callback) {

    var now = moment();
    var nowDate=now.toDate();
    //var nowStr = now.format('YYYY-MM-DD HH:mm:ss');

    var expireDate = (now.add(1, 'hours')).toDate();
    //var expireStr = expireDate.format('YYYY-MM-DD HH:mm:ss');

    var token = {
        'tokenType':token.token_type,
        'scope':token.scope,
        'resource':token.resource,
        'accessToken': token.access_token,
        'refreshToken': refreshToken,
        'createDate': nowDate,
        'expireDate': expireDate
    };

    try {

        //file
        if (TOKEN_TYPE === 1) {
            try {
                fs.mkdirSync(TOKEN_DIR);
            } catch (err) {
                if (err.code != 'EEXIST') {
                    throw err;
                }
            }

            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            logger.log('info', JSON.stringify(token));
            callback(null);
            //console.log('Token stored to ' + TOKEN_PATH);
        }
        //db
        else if (TOKEN_TYPE === 2) {
            (new db()).addToken(token, function (err) {
                if (err) {
                    logger.log('error', err);
                    throw  err;
                } else {
                    // console.log({success: true});
                    logger.log('info', token);
                    callback(null);
                }
            });
        }
    }
    catch (err) {
        callback(err);
    }
}

function refreshStoredToken(token, refreshToken, callback) {
    //file
    if (TOKEN_TYPE === 1) {
        storeToken(token, refreshToken, callback);
    }
    //db
    else if (TOKEN_TYPE === 2) {
        storeToken(token, refreshToken, callback);
    }
}

function getToken(callback) {
    //file
    if (TOKEN_TYPE === 1) {
        var content = fs.readFileSync(TOKEN_PATH);
        if (content == '') {
            var error = new Error();
            error.message = 'Cannot get access token';

            return {err: error, result: ''};
        }
        else {
            return {err: null, result: content};
        }
    }

    //db
    else if (TOKEN_TYPE === 2) {
        db.getLatestToken(function (err, result) {
            if (err) {
                logger.log('error', err);
                //return {err: error, result: ''};
            } else {
                // console.log({success: true});
                //return {err: null, result: JSON.parse(result)};
                callback(null, result);
            }
        });
    }
}


function getRefreshToken(callback) {
    //file
    if (TOKEN_TYPE === 1) {

    }
    //db
    else if (TOKEN_TYPE === 2) {
        db.getLatestRefreshToken(function (err, result) {
            if (err) {
                logger.log('error', err);
                //return {err: error, result: ''};
            } else {
                // console.log({success: true});
                callback(null, result);
            }
        });
    }
}

exports.TOKEN_TYPE = TOKEN_TYPE;
exports.TOKEN_PATH = TOKEN_PATH;
exports.storeToken = storeToken;
exports.refreshStoredToken = refreshStoredToken;
exports.getToken = getToken;
exports.getRefreshToken = getRefreshToken;