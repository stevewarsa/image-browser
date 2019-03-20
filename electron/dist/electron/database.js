"use strict";
var mysql = require("mysql");
var Database = (function () {
    function Database() {
        this.connection = null;
        this.connection = mysql.createConnection({
            host: 'localhost',
            user: 'devuser',
            password: 'Galatians2v20',
            database: 'image-meta-data'
        });
    }
    Database.prototype.query = function (sql, args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.query(sql, args, function (err, rows) {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    };
    Database.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.end(function (err) {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    };
    return Database;
}());
exports.Database = Database;
//# sourceMappingURL=database.js.map