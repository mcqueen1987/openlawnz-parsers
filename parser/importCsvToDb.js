const path = require("path");
const courtCsvFilePath = path.join(__dirname, './data/court_data_import.csv');
const {readCsvToJson} = require('../common/functions');
const {CourtCSVRow} = require('./CourtCSVRow');

const run = async (connection) => {
    const csvJsonData = await readCsvToJson(courtCsvFilePath);
    if (!csvJsonData) {
        return;
    }

    await Promise.all(csvJsonData.map(async row => {
        const court = new CourtCSVRow(connection, row);
        await court.processImport()
    }));
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
}
