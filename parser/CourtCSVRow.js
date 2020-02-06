const TABLE_ACRONYMS = 'citation_acronyms';
const TABLE_CATEGORIES = 'categories';
const TABLE_COURTS = 'courts';

const SCHEMA = 'cases';

/**
 * import a row of court data(CSV) to database
 *
 * original csv data format:
 *   id,abbreviation,court-name,law-report,Category
 *   1,RMA,,New Zealand Resource Management Appeals,Resource Management
 *
 */

class CourtCSVRow {
    constructor(connection, csvData) {

        this.connection = connection;
        this.csvData = csvData;

        // fields from CSV
        this.acronym = this.csvData.abbreviation;
        this.courtName = this.csvData['court-name'];
        this.lawReport = this.csvData['law-report'];
        this.category = this.csvData.Category;
    }

    /**
     * insert CSV data into courts, update if acronym exist otherwise insert
     *
     * @param connection
     * @param courtsData
     * @returns {Promise<void>}
     */
    importCourt = async () => {
        if (!this.acronym) {
            return;
        }
        const results = await this.connection.any(`SELECT count(*) as cnt from ${SCHEMA + '.' + TABLE_COURTS} where acronym='${this.acronym}'`);
        if (results && parseInt(results[0]['cnt'])) {
            await this.connection.none(`UPDATE ${SCHEMA + '.' + TABLE_COURTS} SET court_name='${this.courtName}' where acronym='${this.acronym}'`);
        } else {
            await this.connection.none(`INSERT INTO ${SCHEMA + '.' + TABLE_COURTS} (acronym, court_name) VALUES ('${this.acronym}', '${this.courtName}')`);
        }
    };

    importCategory = async () => {
        const {category} = this;
        if (!category) {
            return;
        }

        const results = await this.connection.any(`SELECT count(*) AS cnt FROM ${SCHEMA + '.' + TABLE_CATEGORIES} WHERE category='${category}'`);
        if (!results || !parseInt(results[0]['cnt'])) {
            await this.connection.none(`INSERT INTO ${SCHEMA + '.' + TABLE_CATEGORIES} (category) VALUES ('${category}')`);
        }
    };

    importCitationAcronyms = async () => {
        const {acronym, lawReport, category} = this;

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
    };

    processImport = async () => {
        await Promise.all([
            this.importCourt(),
            this.importCitationAcronyms(),
            this.importCategory(),
        ])
    }
}

module.exports.CourtCSVRow = CourtCSVRow;