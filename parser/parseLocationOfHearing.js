const {Table} = require('./table');

class LocationParser {
    constructor(conn) {
        this.connection = conn;
    }

    updateCourtLocationFromCases = async (courtId, caseIds) => {
        for (let i = 0; i < caseIds.length; i++) {
            const caseId = caseIds[i];
            const result = await this.connection.any(`SELECT case_text from  ${Table.Cases} WHERE id=${caseId}`);
            const caseText = result[0].case_text;
            const location = this.parseLocationByCaseText(caseText);
            if (location) {
                // update and break when find an non-empty location
                console.log(`update court ${courtId}: ${location}`);
                const sql = `UPDATE ${Table.Courts} SET location='${location}' WHERE id = ${courtId}`;
                await this.connection.none(sql);
                return;
            }
        }
        console.log('  failed case: ', courtId, caseIds.join(" , "))

    };

    getCourtIdToCaseIds = async () => {
        const ret = {};
        const sql = `SELECT co.court_id, ca.id
                     FROM 
                        ${Table.Cases} AS ca
                        JOIN
                        ${Table.CourtToCases} AS co 
                        ON ca.id = co.case_id`;
        const courtIdToCaseId = await this.connection.any(sql);
        courtIdToCaseId.forEach((row) => {
            if (!ret[row.court_id]) {
                ret[row.court_id] = [];
            }
            ret[row.court_id].push(row.id);
        });
        return ret;
    };

    // parse location/case_id from case_text
    parseLocationByCaseText = (caseText) => {
        let regs = [
            /IN\sTHE\s[A-Z\s]+(?:OF|AT)\s(.*)[\r\n]+/,
            /IN THE COURT OF APPEAL OF ([A-Z\s]+)[\r\n]+/
        ];
        for (let i = 0; i < regs.length; i++) {
            let matches = caseText.match(regs[i]);
            if (matches && matches[1]) {
                return matches[1].trim();
            }
        }
        return null;
    };

    process = async () => {
        const courtToCases = await this.getCourtIdToCaseIds();
        await Promise.all(Object.keys(courtToCases).map(async courtId => {
            await this.updateCourtLocationFromCases(courtId, courtToCases[courtId]);
        }));
    }
}

const run = async (connection) => {
    const parser = new LocationParser(connection);
    await parser.process();
};

if (require.main === module) {
    const argv = require('yargs').argv;
    (async () => {
        try {
            const {connection} = await require('../common/setup')(argv.env);
            await run(connection);
        } catch (ex) {
            console.log(ex);
        }
    })().finally(process.exit);
} else {
    module.exports = run;
    module.exports.LocationParser = LocationParser;
}