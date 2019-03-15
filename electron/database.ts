import * as mysql from "mysql";

export class Database {
    connection = null;
    constructor() {
        this.connection = mysql.createConnection( {
            host     : 'localhost',
            user     : 'devuser',
            password : 'Galatians2v20',
            database : 'image-meta-data'
          } );
    }
    query( sql, args ) {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
}