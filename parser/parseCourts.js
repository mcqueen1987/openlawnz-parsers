const {findAcronymItemByCitation} = require('./../common/functions');

const SCHEMA = 'cases';
const COURT_TO_CASES = SCHEMA + '.court_to_cases';
const CASE_CITATIONS = SCHEMA + '.case_citations';
const TABLE_COURT = 'courts';
const COURTS = SCHEMA + '.' + TABLE_COURT;
const CASES = SCHEMA + '.cases';

class CourtParser {
    constructor(conn, promise) {
        this.connection = conn;
        this.pgPromise = promise;
    }

    getCitations = () => {
        return this.connection.any(`SELECT case_id, citation FROM ${CASE_CITATIONS}`);
    };

    getCourts = () => {
        return this.connection.any(`SELECT * FROM ${COURTS}`);
    };

    getCourtNameByCaseText = (caseText) => {
        // parse court_name from case_text
        let regexCourtName = /IN\sTHE\s([\s|A-Z]+)OF\s([\s|A-Z]+)/;
        let match = caseText.match(regexCourtName);
        if (!match || !match[1]) {
            regexCourtName = /IN\sTHE\s(HIGH COURT)OF\s([\s|A-Z]+)/;
            match = caseText.match(regexCourtName);
        }
        if (match && match[1]) {
            return match[1].trim();
        }
        return null;
    };

    getCourtForUpdate = async (citationRow, courts, updatedCourts) => {
        const {case_id: caseId, citation} = citationRow;
        const foundCourt = findAcronymItemByCitation(courts, citation);
        if (!foundCourt) {
            console.log(' can not get correspond court by citation: ', citation);
            return;
        }
        // update courts row if don't have court_name,
        if (!updatedCourts[foundCourt['id']] && !foundCourt['court_name']) {
            const foundCase = await this.connection.any(`SELECT case_text from ${CASES} WHERE id=${caseId}`);
            const courtName = this.getCourtNameByCaseText(foundCase[0]['case_text']);
            if (!courtName) {
                console.log(' can not find court name by : ', citationRow);
                return;
            }
            // update new court_name to courts table
            updatedCourts[foundCourt['id']] = {
                id: foundCourt['id'],
                court_name: courtName
            };
        }
    };

    saveCourts = async (courts) => {
        if (!courts || !courts.length) {
            return;
        }
        const courtsColumnSet = new this.pgPromise.helpers.ColumnSet(
            ['id', 'court_name'],
            {table: {table: TABLE_COURT, schema: SCHEMA}}
        );
        const updateMultiSql = this.pgPromise.helpers.update(courts, courtsColumnSet) + ' WHERE v.id = t.id';
        await this.connection.none(updateMultiSql);
    };


    getAllCourtsNeedUpdate = async (citations, courts) => {
        let courtsToUpdate = {};
        for (let i = 0; i < citations.length; i++) {
            await this.getCourtForUpdate(citations[i], courts, courtsToUpdate);
        }

        return courtsToUpdate;

    };

    /**
     * 1, get all citation in case_citations
     * 2, get correspond case_text and parse court_name from case_text
     * 3, find court by citation
     * 4, if court_name in table courts is empty, record it to update later
     * issue: https://github.com/openlawnz/openlawnz-parsers/issues/8
     *
     */
    updateCourtsByCitations = async (citations, courts) => {
        console.log('\n-----------------------------------');
        console.log('update courts');
        console.log('-----------------------------------\n');

        // 2. get courts need to update
        const courtsToUpdate = await this.getAllCourtsNeedUpdate(citations, courts);

        // 3. update courts
        await this.saveCourts(Object.values(courtsToUpdate));

        console.log('\n-----------------------------------');
        console.log('DONE: update courts');
        console.log('-----------------------------------\n');
    };

    getCourtToCasesSQL = async (courtId, caseId) => {
        // insert court_to_cases row, if Court conflict, update
        const results = await this.connection.any(`SELECT count(*) as cnt from ${COURT_TO_CASES} where case_id='${caseId}'`);
        if (results && parseInt(results[0]['cnt'])) {
            return `UPDATE ${COURT_TO_CASES} SET court_id='${courtId}' where case_id='${caseId}'`;
        } else {
            return `INSERT INTO ${COURT_TO_CASES} (court_id, case_id) VALUES ('${courtId}', '${caseId}')`;
        }
    };

    getAllCourtToCasesSQLs = async (citations, courts) => {
        const updateOrInsertSQLs = [];
        await Promise.all(citations.map(async (citationRow) => {
            const foundCourt = findAcronymItemByCitation(courts, citationRow['citation']);
            if (foundCourt) {
                updateOrInsertSQLs.push(await this.getCourtToCasesSQL(foundCourt['id'], citationRow['case_id']))
            }
        }));

        return updateOrInsertSQLs
    };

    /**
     * 1, get each citation in case_citations
     * 2, get acronym and court_id by citation
     * 3, update court_to_cases with court_id and case_id
     * issue: https://github.com/openlawnz/openlawnz-parsers/issues/8
     *
     * @returns {Promise<void>}
     */
    updateCourtToCases = async (citations, courts) => {
        console.log('\n-----------------------------------');
        console.log('update court to cases');
        console.log('-----------------------------------\n');
        const SQLs = this.getAllCourtToCasesSQLs(citations, courts);

        if (SQLs.length) {
            await this.connection.multi(SQLs.join(';'));
        }
        console.log('\n-----------------------------------');
        console.log('DONE: update court to cases');
        console.log('-----------------------------------\n');
    };
}

const run = async (conn, promise) => {
    const parser = new CourtParser(conn, promise);

    const citations = await parser.getCitations();
    const courts = await parser.getCourts();

    await parser.updateCourtsByCitations(citations, courts);

    await parser.updateCourtToCases(citations, courts);
};

if (require.main === module) {
    const argv = require('yargs').argv;
    (async () => {
        try {
            const {connection, pgPromise} = await require('../common/setup')(argv.env);
            await run(connection, pgPromise);
        } catch (ex) {
            console.log(ex);
        }
    })().finally(process.exit);
} else {
    module.exports = run;
    module.exports.CourtParser = CourtParser
}
