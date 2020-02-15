const {Table} = require('./table');

let failed = 0;
const ignoreCases = {
    // 24208: ' ',
    // 28648:' ',
    // 14306:'of the ESTATE OF ',
    // 6575:' ',
};

const focus = [
];


/**
 *
 * @param conn
 * @param pageNum, start from 1
 * @param pageSize
 * @returns {Promise<*>}
 */
const fetchCases = async (conn, pageNum = 1, pageSize = 200) => {
    let sql = `SELECT * FROM ${Table.Cases}`;
    if(focus.length) {
        sql += ' WHERE id in (' +
            focus.join(', ') +
            ') '; // test
    } else {
        if (pageNum > 0 && pageSize > 0) {
            sql += ` LIMIT ${pageSize} OFFSET ${(pageNum - 1) * pageSize}`;
        }
    }
    const results = await conn.any(sql);
    return results.map(row => new Case(conn, row));
};

class Case {
    constructor(conn, caseData) {
        this.connection = conn;

        this.caseText = caseData.case_text.replace(/[\r\n]+/g, "\n");
        this.id = caseData.id;

        this.fields = {
            appellant: {
                type: 'string',
                patterns: [  // todo unfinished
                    /BETWEEN\s([A-Za-z\-\s]+)Applicants\sAND/,
                    /BETWEEN\s([A-Za-z\-\s,Ā]+)Appellants\sAND/,
                    /BETWEEN\s([A-Za-z0-9\(\)\/\-\s,'\.Āʼ"&]+)(?:Applicant|Appellant)\s(AND)?/,
                    /BETWEEN\s([a-zA-z\sĀŌ]+)\sApplicant/,
                    /([A-Z\(\)\s]+)\nApplicants/,
                    /\n([A-Za-z][A-Za-z0-9,&\(\) ]*)\s[v|V]\s([A-Za-z\-\s]+)/, // should not start with a number
                    /BETWEEN\s([A-Za-z0-9\-\s',\/\(\)"ĀŌ]+?)\sAND/,
                    /([A-Za-z\s]+)for the Appellant/,
                    /the appellant, ([A-Za-z\s]+),/,
                    /BETWEEN([0-9a-zA-Z,\(\)\s&ʼ\-\.\+ŌĀ]+)(?:Plaintiff|Plaintiffs)/,
                    /\n([A-Za-z\s]+) for( the)? Applicant/,
                    /([A-Z\s]+)Applicant/,
                    /IN THE MATTER\s(?:[A-Za-z\s]+)by the Will of([A-Za-z\s]+),/,  //12908
                    /IN THE MATTER OF\sthe Estate of([A-Za-z\s]+)\s*(?:Hearing:|IN THE MATTER)/,  //13405
                    /IN THE MATTER\sof([A-Za-z0-9\s,]+)Hearing:/,
                    /IN THE MATTER\sOF\sTHE ESTATE OF([A-Za-z\s]+)\s*AND\s+IN THE MATTER/,
                    /IN THE\sESTATE\sOF\s?:?([A-Z\s]+)\s*Hearing:/i,  //13554
                    /IN THE ESTATE([A-Z\s]+)On the papers/,  //13554
                    /IN THE MATTER OF\s([A-Za-z\s,]+)BETWEEN/,  //7739
                    /IN THE MATTER\sof([\sa-zA-Z]+)AND/,
                    /of an application by ([A-Za-z\s,]+)for/,
                    /an application by ([A-Z\s]+)/,
                    /IN THE ESTATE OF\s([A-Za-z\s]+)\s*\(DECEASED\)/i,
                    /IN THE ESTATE OF\s([A-Z\s]+)of\s*Rotorua, deceased/,
                    /IN THE ESTATE OF\s([A-Z\s]+)(?:[A-Za-z\s,]+)\sDeceased/,
                    /IN THE ESTATE of\s([A-Za-z\s]+) of Auckland\sin New Zealand, Retired \(Deceased\)/,
                    /IN THE ESTATE\sof([A-Z\s]+),\sof[A-Za-z\s,]+deceased\sAND/,  //14958
                    /IN THE ESTATE\sof([A-Z\s]+)of/,  //14959
                    /IN THE ESTATE of\s?([A-Z\s]+)Hearing:/i,  //15666
                    /IN THE ESTATE\sof\s?([A-Z\-\s]+)/,  //14957
                    /UNDER\s+ESTATE OF\s([A-Z\s\(\)]+)Hearing:/,
                    /Appearances:\s([A-Za-z\s]+) in person/, //14166
                    /Appearances:\s([A-Za-z\s]+) for Applicant/,
                    /(?:IN THE MATTER OF|IN THE ESTATE OF|IN THE MATTER OF an application by)([A-Z\s,\-\(\)\/,'\.Ā"]+)/i,
                    /(?:IN THE MATTER OF|IN THE ESTATE OF|IN THE MATTER OF an application by)([A-Za-z\s,\-\(\)\/,'\.Ā"]+)(?:of|Hearing|Appearances|Deceased|Judgment)/,
                    /IN THE MATTER\s?of\s?the Estate of([A-Za-z\s]+)\s*(?:Hearing:|IN THE MATTER)/,
                ]
            },
            respondent: {
                type: 'string',
                patterns: [
                    /AND([A-Z\s]+)Respondent/,
                    /\s(?:v|AND)\s([A-Za-z0-9\.\-\s',\/\(\)"ĀŌ]+)\s(?:Hearing:|Court:|Counsel:)/,
                ]
            },
            appearances: {
                type: 'string',
                patterns: []
            },
            outcome: {
                type: 'string',
                patterns: []
            },
            language: {
                type: 'string',
                patterns: []
            },
            claimant_age: {
                type: 'number',
                patterns: []
            },
        };

    }

    parseValueByRegPatterns = (patterns) => {
        for (let i = 0; i < patterns.length; i++) {
            const regExp = new RegExp(patterns[i]);
            let matches = regExp.exec(this.caseText);
            if (matches && matches[1].trim()) {
                return matches[1].trim();
            }
        }
        return null;
    };

    parseFieldValue = (regPatternsOrFunc) => {
        if (typeof regPatternsOrFunc === "function") {
            return regPatternsOrFunc();
        }
        if (typeof regPatternsOrFunc === 'string') {
            return this.parseValueByRegPatterns([regPatternsOrFunc]);
        }
        if (Array.isArray(regPatternsOrFunc)) {
            return this.parseValueByRegPatterns(regPatternsOrFunc);
        }
        new Error('invalid type for regPatternsOrFunc');
    };

    saveField = async (fieldName, type, value) => {
        const valueSlot = type === 'number' ? value : `'${value}'`;
        const sql = `UPDATE ${Table.Cases} SET ${fieldName} = ${valueSlot} WHERE id = ${this.id}`;
        // console.log('===<', sql,'> =====');
        return
        await this.connection.none(sql);
    };

    parseAndUpdateField = async (fieldName) => {
        if(ignoreCases[this.id]){
            return;
        }
        if(!this.caseText.trim()) {
            return;
        }

        if (!this.fields[fieldName]) {
            throw new Error('missing definition for field: ' + fieldName);
        }

        const {type, patterns} = this.fields[fieldName];

        const value = this.parseFieldValue(patterns);
        if (!value) {
            failed++;
            // if (failed === 2) {
                console.log(`${this.id} `);
                // process.exit();
                return
            // }
            // return;
        }

        // console.log(`${this.id}   ${value}`);

        // if (value.indexOf('JAMIE NGAHUIA AHSIN') >= 0) {
        //     console.log(this.caseText);
        //     process.exit();
        // }
        await this.saveField(fieldName, type, value.trim());
    };
}

module.exports.Case = Case;
module.exports.fetchCases = fetchCases;