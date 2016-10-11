/*
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */
var OAuth = require('oauth');
var uuid = require('node-uuid');
var tokenUtil = require('./tokenUtil');

// The application registration (must match Azure AD config)
var credentials = {
    authority: 'https://login.microsoftonline.com/common',
    authorize_endpoint: '/oauth2/authorize',
    token_endpoint: '/oauth2/token',
    client_id: 'afdd9b51-74dc-4748-8273-5dc0c36e5e6a',
    client_secret: 'GH3df6LnRv7K/oLc6TJA+ZQbm4B+N+oT1KeHyTRaoYw=',
    redirect_uri: 'http://localhost:3002/login',
    scope: 'User.ReadBasic.All Files.Read Mail.Send offline_access',
    resource: 'https://ebayinc.sharepoint.com/'
};

/**
 * Generate a fully formed uri to use for authentication based on the supplied resource argument
 * @return {string} a fully formed uri with which authentication can be completed
 */
function getAuthUrl() {
    return credentials.authority + credentials.authorize_endpoint +
        '?client_id=' + credentials.client_id +
        '&response_type=code' +
        '&redirect_uri=' + credentials.redirect_uri
}


/**
 * Gets a token for a given resource.
 * @param {string} code An authorization code returned from a client.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromCode(code, callback) {
    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.authority,
        credentials.authorize_endpoint,
        credentials.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        code,
        {
            redirect_uri: credentials.redirect_uri,
            grant_type: 'authorization_code',
            resource: credentials.resource
        },
        function (e, accessToken, refreshToken,results) {
            callback(e, accessToken, refreshToken,results);
        }
    );
}


/**
 * Gets a new access token via a previously issued refresh token.
 * @param {string} refreshToken A refresh token returned in a token response
 *                       from a previous result of an authentication flow.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromRefreshToken(refreshToken, callback) {
    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.authority,
        credentials.authorize_endpoint,
        credentials.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        refreshToken,
        {
            grant_type: 'refresh_token',
            redirect_uri: credentials.redirect_uri,
            resource: credentials.resource
        },
        function (e, accessToken, refreshToken,results) {
            callback(e, accessToken, refreshToken,results);
        }
    );
}


exports.credentials = credentials;
exports.getAuthUrl = getAuthUrl;
exports.getTokenFromCode = getTokenFromCode;
exports.getTokenFromRefreshToken = getTokenFromRefreshToken;
exports.ACCESS_TOKEN_CACHE_KEY = 'ACCESS_TOKEN_CACHE_KEY';
exports.REFRESH_TOKEN_CACHE_KEY = 'REFRESH_TOKEN_CACHE_KEY';
