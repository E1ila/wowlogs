const fs       = require('fs');
const zlib     = require('zlib');
const readline = require('readline');

// CSVToArray from https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm

function CSVToArray( strData, strDelimiter ){
    strDelimiter = (strDelimiter || ",");
    var objPattern = new RegExp(
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        , "gi");

    var arrData = [[]];
    var arrMatches = null;

    while (arrMatches = objPattern.exec( strData )){
        var strMatchedDelimiter = arrMatches[ 1 ];
        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) 
            arrData.push( [] );

        if (arrMatches[ 2 ]) 
            var strMatchedValue = arrMatches[ 2 ].replace(new RegExp( "\"\"", "g" ), "\"");
        else
            var strMatchedValue = arrMatches[ 3 ];

        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }
    return arrData ;
}

module.exports = class CsvTable {
    
    /**
     * Reads a CSV into memory, allows to quickly access rows by certain fields
     * @param {string} filename file to parse
     * @param {string[]} uniqueFields columns to index
     */
    constructor() {
        this.rows = [];
        this.byUniqueField = {};
        this.headers = null;
    }

    async read(filename, uniqueFields) {
        return new Promise((resolve, reject) => {
            for (let field of uniqueFields) 
                this.byUniqueField[field] = {};

            if (!fs.existsSync(filename))
                throw new Error(`Input CSV file doesn't exist: ${filename}`);

            let input = filename.endsWith('.gz') ? {input: fs.createReadStream(filename).pipe(zlib.createGunzip())} : {input: fs.createReadStream(filename)};
            let lineReader = readline.createInterface(input);
            let n = 0;
            lineReader.on("line", (line) => {
                n++;
                let row = CSVToArray(line);
                if (row && row.length)
                    row = row[0];
                else 
                    console.log(`Failed to parse CSV line ${n}: ${line}`);
                if (!this.headers) {
                    this.headers = row;
                } else {
                    this.rows.push(row);
                    for (let field of uniqueFields) {
                        const pos = this.headers.indexOf(field);
                        if (pos != -1) 
                            this.byUniqueField[field][row[pos]] = row;
                    }
                }
            });
            lineReader.on("close", () => {
                resolve();
            });
        });
    }



    /**
     * Fetches a column by a unique index field
     * @param {string} field search column
     * @param {any} value search value
     * @returns string[] the row
     */
    get(field, value) {
        const pos = this.headers.indexOf(field);
        if (pos != -1) 
            return this.byUniqueField[field][value];
        return null;
    }
}