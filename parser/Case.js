const {Table} = require('./table');

// when debug = true
//    1. all failed cases will be logged
//    2. will execute insert SQL
const debug = true;


let failed = 0;
const ignoreCases = {
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
const fetchCases = async (conn, pageNum = 1, pageSize = 100) => {
    let sql = `SELECT * FROM ${Table.Cases}`;
    if (focus.length) {
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
                filter: (text) => {
                    // select only first 100 lines
                    const top100 = text.split('\n').splice(0, 100).join('\n');

                    if(top100.indexOf('respondent') >= 0
                        || top100.indexOf('Respondent') >= 0
                        || top100.indexOf('RESPONDENT') >= 0){
                        return top100;
                    }
                    return null;
                },
                patterns: [
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪŪ]+Plaintiff\sAND([0-9A-Za-z\(\)\s\/&,Ä]+)In Chambers:/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Plaintiff\sAND([0-9A-Za-z\(\)\s\/&,Ä]+)Memoranda:/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Plaintiff\sAND([0-9A-Za-z\(\)\s\/&,Ä]+)Hearing:/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Plaintiff\sAND([0-9A-Za-z\(\)\s\/&,Ä]+)CIV/,

                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+AND([A-Za-z\s]+)Counsel's Memorandum/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+AND([A-Za-z&\s]+)Respondents/,

                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Appellants\sAND([\sA-Za-z\(\)-\\&*–ŪᾹʼ]+)(In Chambers|Hearing)/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-]+Appellant\sAND([\sA-Za-z\(\)-\\*–&ʼ\[\]']+)On the papers:/,

                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Appellant\sAND([\sA-Za-z\(\)-\\*–&ʼ\[\]'Í]+)Hearing/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Appellant\sAND([\sA-Za-z\(\)-\\*–&ʼ\[\]'Í]+)Court/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Appellant\sAND([\sA-Za-z\(\)-\\*–&ʼ\[\]'Í]+)SC\s\d+\/\d+\s/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Appellant([\sA-Za-z\(\)-\\*–&ʼ\[\]'Í]+)Hearing/,

                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Applicants\sAND([\sA-Za-z\(\)-\\&*–ŪĀŌÇ\[\]'ʼ]+)(In Chambers|Submissions filed|Hearing|On the papers|Representation|Court:)/,
                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Applicant\sAND([\sA-Za-z\(\)-\\&*–ŪĀŌÇ\[\]'ʼ]+)(In Chambers:|On the papers|Hearing|Tel Conference|Submissions received|Appearances|Court)/,

                    /BETWEEN[A-Za-z0-9,'&\.\/\s\(\)-ĀŌÄŪ]+Applicants\sAND([\sA-Za-z\(\)-\\&*–ŪĀŌÇ\[\]'ʼ]+)CIV/,

                    /Plaintiff\s+AND\s+([A-Za-z-\s\(\)Ö]+)(Conference|Appearances|On the papers|Hearing):/,

                    /Applicant\s+AND\s+([A-Za-z\s]+)Conference:/,

                    /Plaintiff\s+AND\s+([A-Za-z-\s\(\)Ö]+)Defendant/,
                    /Plaintiffs([A-Za-z\s]+Defendant)/,

                    /AND([A-Z\s&]+)Respondent/,
                    /\s(?:v|AND)\s([A-Za-z0-9\.\-\s',\/\(\)"ĀŌ]+)\s(?:Hearing:|Court:|Counsel:|Judgment:)/,
                    /\n[A-Za-z][A-Za-z0-9,&\(\) ]*\s[v|V]\s([A-Za-z\-\s]+)Hearing/,

                ]
            },
            respondent_appearance: {   // `in person`/`on own behalf`/ person name /
                type: 'string',
                filter: (text) => {
                    // select only first 100 lines
                    const line100 = text.split('\n').splice(0, 100).join('\n');

                    return line100
                },
                patterns: [
                    /[^\n]+for[^\n]*(?:plaintiffs|plaintiff|appellants|appellant|applicants|applicant)([^\n]+)for[^\n]* (?:defendants|defendant|respondents|Respondent)/i,
                    /Counsel:\s[^\n]+(?:appellant:Plaintiff)\s([^\n]+Respondent)/i,
                    /([^\n]+)for[^\n]+(?:Defendant|Respondent)/i,
                    /([^\n]+)for Prisoner/i,
                    /for appellant ([^\n]+)for Crown/i,
                ]
            },
            appellant_appearance: {   // `in person`/`on own behalf`/ person name /
                type: 'string',
                filter: (text) => {
                    // select only first 100 lines
                    const line100 = text.split('\n').splice(0, 100).join('\n');

                    return line100
                },
                patterns: [
                    /([^\n]+)for the (?:Appellants|Appellant|Applicants|Applicant|plaintiffs|plaintiff|plantiffs)/i,
                    /([^\n]+)for (?:Appellants|Appellant|Applicants|Applicant|plaintiffs|plaintiff|plantiffs)/i,
                    /(?:Appellants|Appellant|Applicants|Applicant|plaintiffs|plaintiff)[^\n]+(in person)/i,
                    /(?:Appellants|Appellant|Applicants|Applicant|plaintiffs|plaintiff)[^\n]+(on own behalf)/i,
                    /([^\n]+)on behalf of the Appellant/i,
                    /Counsel:\s[^\n]+(in person)/i,

                    /Appearances:\s[^\n]+(\(?in Person\)?)/i,
                    /Appearances:\s[^\n]+appearing (in person)/i,

                    /Appearances:\s[^\n]+(for himself)/i,

                    /([^\n]+)for Crown/i,
                    /([^\n]+)for the Crown/i,

                    /appears\s(in person)/i,

                    /\s[^\n]+ (in person)/i,

                    // /(on the paper)/i, // could be no appearance for appellants, should be ignored
                ]
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

    parseValueByRegPatterns = (patterns, text) => {
        for (let i = 0; i < patterns.length; i++) {
            const regExp = new RegExp(patterns[i]);
            const matches = regExp.exec(text);

            if (matches && matches[1] && matches[1].trim()) {
                return matches[1].trim();
            }

        }
        return null;
    };

    parseFieldValue = (regPatternsOrFunc, text) => {
        if (typeof regPatternsOrFunc === "function") {
            return regPatternsOrFunc(text);
        }
        if (typeof regPatternsOrFunc === 'string') {
            return this.parseValueByRegPatterns([regPatternsOrFunc], text);
        }
        if (Array.isArray(regPatternsOrFunc)) {
            return this.parseValueByRegPatterns(regPatternsOrFunc, text);
        }
        new Error('invalid type for regPatternsOrFunc');
    };

    saveField = async (fieldName, type, value) => {
        const valueSlot = type === 'number' ? value : `'${value}'`;
        const sql = `UPDATE ${Table.Cases} SET ${fieldName} = ${valueSlot} WHERE id = ${this.id}`;
        await this.connection.none(sql);
    };

    parseAndUpdateField = async (fieldName) => {
        if (ignoreCases[this.id]) {
            return;
        }
        if (!this.caseText.trim()) {
            return;
        }

        if (!this.fields[fieldName]) {
            throw new Error('missing definition for field: ' + fieldName);
        }

        const {type, patterns, filter} = this.fields[fieldName];

        // use `filter` callback to filter invalid case before parse
        let text = this.caseText;
        if(filter) {
            text = filter(this.caseText);
        }

        if(!text) {
            // ignore invalid cases
            return
        }

        const value = this.parseFieldValue(patterns, text);
        if (!value) {
            failed++;
            if(debug) {
                console.log(`${this.id}, `);
            }
            return;
        }
        console.log(`${this.id}, ${value}`);
        // save to database if not debug
        !debug && await this.saveField(fieldName, type, value);
    };
}

module.exports.Case = Case;
module.exports.fetchCases = fetchCases;