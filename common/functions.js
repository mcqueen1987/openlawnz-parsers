const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const parser = require('csv-parser')

module.exports.makeLogger = () => {
    var logDir;
    var logFile;
    var logFileWithoutExtension;
    var logFileExtension;

    return {

        setLogDir: dir => {
            logDir = dir;
        },
        setLogFile: fileName => {
            logFile = path.basename(fileName);
            var logFileSplit = logFile.split(".");
            logFileWithoutExtension = logFileSplit[0];
            logFileExtension = "txt";
        },
        log: (data, append, appendFileName) => {
            if (!process.env.SUPPRESS_LOGGING) {
                if (!logFile) {
                    console.log(data);
                } else {
                    if (Array.isArray(data)) {
                        data = data.join("\t");
					};
                    var method = !append ? fs.writeFileSync : fs.appendFileSync;
                    var currentLogFile = !appendFileName
                        ? logFile
                        : logFileWithoutExtension + '-' + appendFileName + "." + logFileExtension;
                    method(path.join(logDir, currentLogFile), data);
                }
            }
        }
    };
};

module.exports.insertSlash = function (citation, insertString) {
    var first = citation.substring(0, 4);
    var second = citation.substring(4);
    return first + insertString + second;
};

// https://hackernoon.com/accessing-nested-objects-in-javascript-f02f1bd6387f
module.exports.getNestedObject = (nestedObj, pathArr) => {
    return pathArr.reduce(
        (obj, key) => (obj && obj[key] !== "undefined" ? obj[key] : undefined),
        nestedObj
    );
};

module.exports.formatName = function (longName) {
    const regExName = /^(.*?) \[/;
    const regExFileNumber = /(.*)(?= HC| COA| SC| FC| DC)/;
    // regexName gets everything up to square bracket
    // if that matches, return that
    if (longName.match(regExName)) {
        return longName.match(regExName)[1];
    }
    // if not, regExLongName matches everything up to the first " HC", coa, sc, fc or dc, those usually signifying the start of case reference
    else {
        if (longName.match(regExFileNumber)) {
            return longName.match(regExFileNumber)[1];
        } else {
            return "Unknown case";
        }
    }
};

// From https://github.com/so-ta/sha256-file/blob/master/index.js
module.exports.sha256File = function (filename, callback) {
    var sum = crypto.createHash("sha256");
    if (callback && typeof callback === "function") {
        var fileStream = fs.createReadStream(filename);
        fileStream.on("error", function (err) {
            return callback(err, null);
        });
        fileStream.on("data", function (chunk) {
            try {
                sum.update(chunk);
            } catch (ex) {
                return callback(ex, null);
            }
        });
        fileStream.on("end", function () {
            return callback(null, sum.digest("hex"));
        });
    } else {
        sum.update(fs.readFileSync(filename));
        return sum.digest("hex");
    }
};

module.exports.encodeURIfix = str => {
    return encodeURIComponent(str)
        .replace(/!/g, "%21")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
        .replace(/'/g, "%27")
        .replace(/_/g, "%5F")
        .replace(/\*/g, "%2A")
        .replace(/\./g, "%2E");
};

module.exports.slashToDash = function (str) {
    const regExSlash = /\//g;
    return str.replace(regExSlash, "-");
};

module.exports.getCitation = function (str) {
    const regCite = /(\[?\d{4}\]?)(\s*?)NZ(D|F|H|C|S|L)(A|C|R)(\s.*?)(\d+)*/;
    // try for neutral citation
    if (str.match(regCite)) {
        return str.match(regCite)[0];
    } else {
        // try for other types of citation
        const otherCite = /((\[\d{4}\])(\s*)NZ(D|F|H|C|S|L)(A|C|R)(\s.*?)(\d+))|((HC|DC|FC) (\w{2,4} (\w{3,4}).*)(?=\s\d{1,2} ))|(COA)(\s.{5,10}\/\d{4})|(SC\s\d{0,5}\/\d{0,4})/;
        if (str.match(otherCite)) {
            return str.match(otherCite)[0];
        } else {
            return null;
        }
    }
};

module.exports.readCsvToJson = (filePath) => {
    let results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(parser())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            })
            .on('error', error =>
                reject(error)
            );
    });
};

/**
 * find acronyms row by citation from acronyms list
 *
 * @param acronymList, e.g [{ acronym: 'ERNZ', category: 'Employment', court_id: 17 }]
 * @param citation, e.g '[2019] ERNZ 9/2011'
 * @returns {*}
 */
module.exports.findAcronymItemByCitation = (acronymList, citation) => {
    return acronymList.find((item) => {
        // should not use str.includes(), coz if acronym='HC' with match citation: [2014] NZHC 2750
        let regCitation = /(?:[\[|\(])?(?:[12][0-9]{3})(?:[\]|\)])?\s?(?:\d*\s)?([a-zA-Z]{2,7})/;
        let match = citation.match(regCitation);
        if (!match || !match[1]) {
            regCitation = /([\w]{2,4})\s[\d\w]{1,6}\/(?:[12][0-9]{3})/;
            // parse citations like :
            // SC 109/2010
            // SC 9/2011
            // COA CA314/2012
            match = citation.match(regCitation);
        }
        if (!match || !match[1]) {
            regCitation = /([\w]{2})(?:\s+[\w]{2,4})?\s(?:CIV|CRI)?/i;
            // parse citations like :
            // HC PMN CIV-2004-454-670
            // HC HAM CIV-2009-419-136
            // HC AK CIV 2010-404-3074
            match = citation.match(regCitation);
        }
        return !!match[1] && match[1] === item.acronym.toUpperCase();
    });
};

module.exports.arrayEquals = (arr1, arr2) => {
    if (
        arr1.length == arr2.length
        && arr1.every(function (u, i) {
            return u === arr2[i];
        })
    ) {
        return true;
    } else {
        return false;
    }
};

