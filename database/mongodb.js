var mongoose = require('mongoose');
var options = {
    server: {socketOptions: {keepAlive: 300000, connectTimeoutMS: 30000}},
    replset: {socketOptions: {keepAlive: 300000, connectTimeoutMS: 30000}}
};

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/test', options);

var Schema = mongoose.Schema; //创建模型

var tokenSchema = new Schema({
    tokenType: {type: String},
    scope: {type: String},
    resource: {type: String},
    accessToken: {type: String, required: true, trim: true},
    refreshToken: {type: String, required: true, trim: true},
    createDate: {type: Date},
    expireDate: {type: Date}
}, {
    timestamps: true
});

tokenSchema.methods.addToken = function (token, callback) {
    this.tokenType = token.tokenType;
    this.scope = token.scope;
    this.resource = token.resource;
    this.accessToken = token.accessToken;
    this.refreshToken = token.refreshToken;
    this.createDate = token.createDate;
    this.expireDate = token.expireDate;

    this.save(callback);
}


var token = mongoose.model('Tokens', tokenSchema);

token.getLatestToken = function (callback) {
    token.findOne({}, {tokenType: 1, accessToken: 1, expireDate: 1}, {sort: {'createdAt': -1}}, function (err, rs) {
        callback(err, rs);
    });
}

token.getLatestRefreshToken = function (callback) {
    token.findOne({}, { refreshToken: 1, expireDate: 1}, {sort: {'createdAt': -1}}, function (err, rs) {
        callback(err, rs);
    });
}


//exports.student=student;
module.exports = token;
