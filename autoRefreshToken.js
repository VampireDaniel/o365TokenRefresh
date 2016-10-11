var authHelper = require('./authHelper.js');
var requestUtil = require('./requestUtil.js');
var appConfig = require('./appConfig/config.json');
var path = require('path');
var tokenUtil = require('./tokenUtil.js');
var schedule = require('node-schedule');
var logger = require('./common/logger/logger').logger;


function scheduleRefreshToken() {
    console.log('schedule job start');

    //run immediately and schedule every 10 mins
    autoRefreshToken();

    var taskSchedule = new schedule.RecurrenceRule();
    taskSchedule.minute = [0, 10, 20, 30, 40, 50];
    var job = schedule.scheduleJob(taskSchedule, function () {
        autoRefreshToken();
    });
}

function autoRefreshToken() {

    // var accessToken = '';
    var refreshToken = '';

    tokenUtil.getRefreshToken(function (err, token) {

        if (err === null && token !== null) {
            refreshToken = token.refreshToken;
        }
        else {
            if (err !== null){
                logger.log('error',err);
            }
            else{
                logger.log('error','there is no token');
            }
        }

        authHelper.getTokenFromRefreshToken(refreshToken, function (refreshErr, accessToken_r, refreshToken_r, results_r) {
            if (refreshErr === null) {
                //accessToken=accessToken_r;
                refreshToken = refreshToken_r;

                //logger.log('info',{accessToken:accessToken,refreshToken:refreshToken});
                tokenUtil.refreshStoredToken(results_r, refreshToken, function (err) {
                    if (err === null) {
                        logger.log('info', 'store latest token to mongodb successful');
                    }
                    else {
                        logger.log('error', err);
                    }
                });
            } else {
                logger.log('error', refreshErr);
            }
        });
    });
}


exports.scheduleRefreshToken = scheduleRefreshToken;