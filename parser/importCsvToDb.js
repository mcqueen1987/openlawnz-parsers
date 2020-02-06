const path = require("path");
const courtCsvFilePath = path.join(__dirname, './data/court_data_import.csv');
const {readCsvToJson} = require('../common/functions');
const TABLE_ACRONYMS = 'citation_acronyms';
const TABLE_CATEGORIES = 'categories';
const TABLE_COURTS = 'courts';

const SCHEMA = 'cases';

class CSVImporter {
    constructor(connection) {
        this.connection = connection;
    }

    /**
     * insert CSV data into courts, update if acronym exist otherwise insert
     *
     * @param connection
     * @param courtsData
     * @returns {Promise<void>}
     */
    importCsvToCourts = async (courtsData) => {
        console.log('\n-----------------------------------');
        console.log('import CSV To courts');
        console.log('-----------------------------------\n');

        await Promise.all(courtsData.map(async (court) => {
            const {abbreviation: acronym, 'court-name': courtName} = court;
            if (!acronym) {
                return;
            }
            const results = await this.connection.any(`SELECT count(*) as cnt from ${SCHEMA + '.' + TABLE_COURTS} where acronym='${acronym}'`);
            if (results && parseInt(results[0]['cnt'])) {
                await this.connection.none(`UPDATE ${SCHEMA + '.' + TABLE_COURTS} SET court_name='${courtName}' where acronym='${acronym}'`);
            } else {
                await this.connection.none(`INSERT INTO ${SCHEMA + '.' + TABLE_COURTS} (acronym, court_name) VALUES ('${acronym}', '${courtName}')`);
            }
        }));
        console.log('\n-----------------------------------');
        console.log('DONE: import CSV To courts');
        console.log('-----------------------------------\n');
    };

    /**
     * insert CSV data into table categories
     *
     * @param connection
     * @param courtsData
     * @param schemaName
     * @returns {Promise<void>}
     */
    importCsvToCategory = async (courtsData) => {
        console.log('\n-----------------------------------');
        console.log('import CSV To category');
        console.log('-----------------------------------\n');

        await Promise.all(courtsData.map(async court => {
            const category = court.Category;
            if (!category) {
                return
            }

            const results = await this.connection.any(`SELECT count(*) AS cnt FROM ${SCHEMA + '.' + TABLE_CATEGORIES} WHERE category='${category}'`);
            if (!results || !parseInt(results[0]['cnt'])) {
                await this.connection.none(`INSERT INTO ${SCHEMA + '.' + TABLE_CATEGORIES} (category) VALUES ('${category}')`);
            }
        }));
        console.log('\n-----------------------------------');
        console.log('DONE: import CSV To category');
        console.log('-----------------------------------\n');
    };

    /**
     * insert CSV data into citation_acronyms, update if acronym exist otherwise insert
     *
     * @param connection
     * @param courtsData
     * @param schemaName
     * @returns {Promise<void>}
     */
    importCsvToCitationAcronyms = async (courtsData) => {
        console.log('\n-----------------------------------');
        console.log('import CSV To citation acronyms');
        console.log('-----------------------------------\n');

        await Promise.all(courtsData.map(async courtItem => {
            const {
                abbreviation: acronym,
                'law-report': lawReport,
                'Category': category
            } = courtItem;

            if (!acronym) {
                return
            }

            const court = await this.connection.any(`SELECT id from ${SCHEMA + '.' + TABLE_COURTS} where acronym='${acronym}'`);
            if (!court || !court[0]) { // court with acronym not exist
                return
            }
            const courtId = court[0]['id'];
            // update if exist, insert if not exist
            const results = await this.connection.any(`SELECT count(*) as cnt from ${SCHEMA + '.' + TABLE_ACRONYMS} where acronym='${acronym}'`);
            if (results && parseInt(results[0]['cnt'])) {
                await this.connection.none(`UPDATE ${SCHEMA + '.' + TABLE_ACRONYMS} SET court_id='${courtId}', law_report='${lawReport}', category='${category}' where acronym='${acronym}'`);
            } else {
                await this.connection.none(`INSERT INTO ${SCHEMA + '.' + TABLE_ACRONYMS} (acronym, court_id, law_report, category) VALUES ('${acronym}', '${courtId}', '${lawReport}', '${category}')`);
            }

        }));

        console.log('\n-----------------------------------');
        console.log('DONE: import CSV To acronyms');
        console.log('-----------------------------------\n');
    };

    /**
     * import court and category info from csv file to db
     * run this script when csv file have been updated
     *
     * @param connection
     * @returns {Promise<void>}
     */
    importCsvDataToDB = async () => {
        const csvJsonData = await readCsvToJson(courtCsvFilePath);
        if (!csvJsonData) {
            return;
        }

        await Promise.all([
            this.importCsvToCourts(csvJsonData),
            this.importCsvToCitationAcronyms(csvJsonData),
            this.importCsvToCategory(csvJsonData)
        ])
    };
}


const run = async (connection) => {
    const importer = new CSVImporter(connection);
    await importer.importCsvDataToDB();
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
    module.exports.CSVImporter = CSVImporter;
}
