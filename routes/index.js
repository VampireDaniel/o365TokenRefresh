/*
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */
var express = require('express');
var router = express.Router();
var authHelper = require('../authHelper.js');
var requestUtil = require('../requestUtil.js');
var emailer = require('../emailer.js');
var url = require('url');
var hbs = require('hbs');
//var winston = require('winston');

var appConfig = require('../appConfig/config.json');
var moment = require('moment');
var path = require('path');
var tokenUtil = require('../tokenUtil.js');
var logger = require('../common/logger/logger').logger;
var cipher = require('../common/authorizer/crypter.js');
var schedule = require('node-schedule');


/* GET home page. */
router.get('/', function (req, res) {
    res.redirect('login');

    // // check for token
    // if (req.cookies.REFRESH_TOKEN_CACHE_KEY === undefined) {
    //     res.redirect('login');
    // } else {
    //     //redirect to search page
    //     res.redirect('search');
    // }
});


router.get('/disconnect', function (req, res) {
    req.session.destroy();
    res.clearCookie('nodecookie');
    clearCookies(res);
    res.status(200);
    res.redirect('http://localhost:3002');
});


/* GET home page. */
router.get('/login', function (req, res) {
    //console.logs("url:"+req.originalUrl);
    //console.logs(req.query.code);
    if (req.query.code !== undefined) {
        authHelper.getTokenFromCode(req.query.code, function (e, accessToken, refreshToken, results) {
            if (e === null) {
                // cache the refresh token in a cookie and go back to index
                // res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
                // res.cookie(authHelper.REFRESH_TOKEN_CACHE_KEY, refreshToken);

                tokenUtil.storeToken(results, refreshToken, function (err) {
                    if (err != null) {
                    }
                });

                res.redirect('/');
            } else {
                console.log(JSON.parse(e.data).error_description);
                res.status(500);
                res.send();
            }
        });
    } else {
        res.render('login', {auth_url: authHelper.getAuthUrl()});
    }
});


router.get('/getTokenApi', function (req, res) {
    if (req.query.timespan !== undefined) {

        var timespan = req.query.timespan;
        var code = req.query.code;

        cipher.authorize(timespan, function (err, result) {
            if (err === null && result === code) {
                tokenUtil.getToken(function (err, token) {
                    logger.log('info', 'sb get token');

                    res.render(
                        'getTokenApi', {token: JSON.stringify(token), layout: false}
                    )
                    ;
                });
            }
            else {
                if (err === null && result === false) {
                    logger.log('error', 'unauthorized code');
                }
                else {
                    logger.log('error', err);
                }
            }
        });


    } else {
        res.render('getTokenApi', {auth_url: authHelper.getAuthUrl()});
    }
});


function renderSendMail(req, res) {
    requestUtil.getUserData(
        req.cookies.ACCESS_TOKEN_CACHE_KEY,
        function (firstRequestError, firstTryUser) {
            if (firstTryUser !== null) {
                req.session.user = firstTryUser;
                res.render(
                    'sendMail',
                    {
                        display_name: firstTryUser.displayName,
                        user_principal_name: firstTryUser.userPrincipalName
                    }
                );
            } else if (hasAccessTokenExpired(firstRequestError)) {
                // Handle the refresh flow
                authHelper.getTokenFromRefreshToken(
                    req.cookies.REFRESH_TOKEN_CACHE_KEY,
                    function (refreshError, accessToken) {
                        res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
                        if (accessToken !== null) {
                            requestUtil.getUserData(
                                req.cookies.ACCESS_TOKEN_CACHE_KEY,
                                function (secondRequestError, secondTryUser) {
                                    if (secondTryUser !== null) {
                                        req.session.user = secondTryUser;
                                        res.render(
                                            'sendMail',
                                            {
                                                display_name: secondTryUser.displayName,
                                                user_principal_name: secondTryUser.userPrincipalName
                                            }
                                        );
                                    } else {
                                        clearCookies(res);
                                        renderError(res, secondRequestError);
                                    }
                                }
                            );
                        } else {
                            renderError(res, refreshError);
                        }
                    });
            } else {
                renderError(res, firstRequestError);
            }
        }
    );
}


router.post('/', function (req, res) {
    var destinationEmailAddress = req.body.default_email;
    var mailBody = emailer.generateMailBody(
        req.session.user.displayName,
        destinationEmailAddress
    );
    var templateData = {
        display_name: req.session.user.displayName,
        user_principal_name: req.session.user.userPrincipalName,
        actual_recipient: destinationEmailAddress
    };

    requestUtil.postSendMail(
        req.cookies.ACCESS_TOKEN_CACHE_KEY,
        JSON.stringify(mailBody),
        function (firstRequestError) {
            if (!firstRequestError) {
                res.render('sendMail', templateData);
            } else if (hasAccessTokenExpired(firstRequestError)) {
                // Handle the refresh flow
                authHelper.getTokenFromRefreshToken(
                    req.cookies.REFRESH_TOKEN_CACHE_KEY,
                    function (refreshError, accessToken) {
                        res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
                        if (accessToken !== null) {
                            requestUtil.postSendMail(
                                req.cookies.ACCESS_TOKEN_CACHE_KEY,
                                JSON.stringify(mailBody),
                                function (secondRequestError) {
                                    if (!secondRequestError) {
                                        res.render('sendMail', templateData);
                                    } else {
                                        clearCookies(res);
                                        renderError(res, secondRequestError);
                                    }
                                }
                            );
                        } else {
                            renderError(res, refreshError);
                        }
                    });
            } else {
                renderError(res, firstRequestError);
            }
        }
    );
});


function hasAccessTokenExpired(e) {
    var expired;
    if (!e.innerError) {
        expired = false;
    } else {
        expired = e.code === 401 &&
            e.innerError.code === 'InvalidAuthenticationToken' &&
            e.innerError.message === 'Access token has expired.';
    }
    return expired;
}


function clearCookies(res) {
    res.clearCookie(authHelper.ACCESS_TOKEN_CACHE_KEY);
    res.clearCookie(authHelper.REFRESH_TOKEN_CACHE_KEY);
}

function renderError(res, e) {
    res.render('error', {
        message: e.message,
        error: e
    });
}


hbs.registerHelper('checkIsWorkId', function (key, value) {
    // console.logs(context);

    if (key === 'WorkId') {
        return '<a href="javascrip:void(0);" onclick="getProperties(' + value + ')" >' + value + '</a>';
    }
    else {
        return value;
    }
});

// router.get('/autoRefreshToken', function (req, res) {
//     var token = tokenUtil.getToken();
//     var accessToken = token.accessToken;
//     var refreshToken = token.refreshToken;
//
//     if (req.query.querytext !== undefined) {
//         var searchText = '\'' + req.query.querytext + '\'';
//
//         requestUtil.getSearch(accessToken, searchText, function (firstErr, result) {
//             if (firstErr === null) {
//                 var elapsedTime = result.ElapsedTime;
//                 var table = result.PrimaryQueryResult.RelevantResults.Table;
//
//                 res.render(
//                     'search',
//                     {
//                         strResult: JSON.stringify(table),
//                         result: table,
//                         elapsedTime: elapsedTime
//                     }
//                 );
//             }
//             else if (hasAccessTokenExpired(firstErr)) {
//                 authHelper.getTokenFromRefreshToken(refreshToken, function (refreshErr, accessToken_r, refreshToken_r) {
//                     if (refreshErr === null) {
//                         accessToken = accessToken_r;
//                         refreshToken = refreshToken_r;
//
//                         tokenUtil.refreshStoredToken(accessToken, refreshToken, function (err) {
//                             if (err != null) {
//
//                             }
//                         });
//
//                         requestUtil.getSearch(accessToken, searchText, function (secondErr, result) {
//                             if (secondErr === null) {
//                                 var elapsedTime = result.ElapsedTime;
//                                 var table = result.PrimaryQueryResult.RelevantResults.Table;
//
//                                 res.render(
//                                     'search',
//                                     {
//                                         strResult: JSON.stringify(table),
//                                         result: table,
//                                         elapsedTime: elapsedTime
//                                     }
//                                 );
//                             }
//                             else {
//                                 renderError(res, secondErr);
//                             }
//                         });
//
//                     } else {
//                         renderError(res, refreshErr);
//                     }
//                 });
//             }
//             else {
//                 renderError(res, firstErr);
//             }
//         });
//     }
//     else {
//         res.render('search');
//     }
// });

// router.get('/refreshToken', function (req, res) {
//     var token = tokenUtil.getToken();
//
//     if (token.err === null) {
//         var accessToken = token.result.accessToken;
//         var refreshToken = token.result.refreshToken;
//     }
//     else {
//         res.redirect('login');
//     }
//
//     authHelper.getTokenFromRefreshToken(refreshToken, function (refreshErr, accessToken_r, refreshToken_r) {
//         if (refreshErr === null) {
//             accessToken = accessToken_r;
//             refreshToken = refreshToken_r;
//
//             tokenUtil.refreshStoredToken(accessToken, refreshToken, function (err) {
//                 if (err != null) {
//
//                 }
//                 else {
//                 }
//             });
//
//             requestUtil.getSearch(accessToken, '\'daniel\'', function (secondErr, result) {
//                 if (secondErr === null) {
//                     // var elapsedTime = result.ElapsedTime;
//                     // var table = result.PrimaryQueryResult.RelevantResults.Table;
//
//                     // res.render(
//                     //     'search',
//                     //     {
//                     //         strResult: JSON.stringify(table),
//                     //         result: table,
//                     //         elapsedTime: elapsedTime
//                     //     }
//                     // );
//                 }
//                 else {
//                     renderError(res, secondErr);
//                 }
//             });
//
//         } else {
//             renderError(res, refreshErr);
//         }
//     });
//
// });

// router.get('/properties', function (req, res) {
//     if (req.query.querytext !== undefined) {
//         var searchText = req.query.querytext + '&' + req.query.refiners;
//
//         requestUtil.getSearch(req.cookies.ACCESS_TOKEN_CACHE_KEY, searchText, function (err, result) {
//             if (result !== null) {
//                 var elapsedTime = result.ElapsedTime;
//                 var table = result.PrimaryQueryResult.RelevantResults.Table;
//
//                 res.render(
//                     'properties',
//                     {
//                         strResult: JSON.stringify(table),
//                         result: table,
//                         elapsedTime: elapsedTime
//                     }
//                 );
//             }
//             else {
//                 renderError(res, err);
//             }
//         });
//     }
//     else {
//         res.render('properties');
//     }
// });
// router.get('/search', function (req, res) {
//     var accessToken = '';
//     var refreshToken = '';
//
//     tokenUtil.getToken(function (err, token) {
//
//         if (err === null) {
//             accessToken = token.accessToken;
//             refreshToken = token.refreshToken;
//         }
//         else {
//             res.redirect('login');
//         }
//
//         if (req.query.querytext !== undefined) {
//             var searchText = '\'' + req.query.querytext + '\'';
//             requestUtil.getSearch(accessToken, searchText, function (err, result) {
//                 if (err === null) {
//                     var elapsedTime = result.ElapsedTime;
//                     var table = result.PrimaryQueryResult.RelevantResults.Table;
//
//                     res.render(
//                         'search',
//                         {
//                             //strResult: JSON.stringify(table),
//                             result: table,
//                             elapsedTime: elapsedTime
//                         }
//                     );
//                 }
//                 else {
//                     if (err.code === '401') {
//
//                     }
//                     else {
//                         renderError(res, err);
//                     }
//                 }
//             });
//         }
//         else {
//             res.render('search');
//         }
//     })
// });


module.exports = router;
