const path = require("path");
const courtCsvFilePath = path.join(__dirname, './data/court_data_import.csv');
const tableCitationAcronyms = 'cases.citation_acronyms';
const tableCategories = 'cases.categories';
const tableCategoryToCases = 'cases.category_to_cases';
const tableCaseCitations = 'cases.case_citations';
const {findAcronymItemByCitation} = require('./../common/functions');

class CategoryParser {
    constructor(connection) {
        this.connection = connection;
        this.citations = [];
        this.categories = [];
        this.acronyms = [];
    }

    initData = async () => {
        // fetch citations/acronyms/courts
        this.citations = await this.connection.any(`SELECT case_id, citation FROM ${tableCaseCitations}`);
        this.categories = await this.connection.any(`SELECT * FROM ${tableCategories}`);
        this.acronyms = await this.connection.any(`SELECT acronym, category, court_id FROM ${tableCitationAcronyms} where court_id IS NOT NULL`);
    };

    insertCategoryToCases = async (caseId, foundAcronyms) => {
        const {category} = foundAcronyms;
        if (!category) {
            console.log(`category is empty, check and complete the information in csv file ${courtCsvFilePath} then run this script again, ${JSON.stringify(foundAcronyms)}`);
            return
        }
        if (category !== 'ACC' && category !== 'NZACC') {
            console.log(`category is not 'ACC' or 'NZACC' will be ignored at this stage, ${JSON.stringify(foundAcronyms)}`);
            return
        }
        const foundCategory = this.categories.find((categoryItem) => categoryItem.category === category);
        // if category conflict - add both categories (unique (case_id, category_id))
        const sql = `INSERT INTO ${tableCategoryToCases} (case_id, category_id) VALUES (${caseId}, ${foundCategory['id']}) ON CONFLICT DO NOTHING `;
        await this.connection.none(sql);
    };

    /**
     * 1, get citation in case_citations
     * 2, get citation_acronyms.category by match acronym and citation
     * 3, insert category into category_to_cases, if category conflict - add both categories
     * 4, only save categories is 'ACC' and 'NZACC'
     * issue: https://github.com/openlawnz/openlawnz-parsers/issues/8
     *
     * @param connection
     * @returns {Promise<void>}
     */
    updateCategoryToCases = async () => {
        console.log('\n-----------------------------------');
        console.log('update category to cases');
        console.log('-----------------------------------\n');

        await Promise.all(
            this.citations.map(async citationRow => {
                // if row in acronym table has court-name reference, then insert into category_to_cases
                const foundAcronyms = findAcronymItemByCitation(this.acronyms, citationRow.citation);
                if (foundAcronyms && foundAcronyms.court_id) {
                    await this.insertCategoryToCases(citationRow.case_id, foundAcronyms);
                } else {
                    console.log(` can not find citations acronyms row with citation:  ${citationRow.citation}`);
                }
            })
        );

        console.log('\n-----------------------------------');
        console.log('DONE: update category to cases');
        console.log('-----------------------------------\n');
    }
}


const run = async (connection) => {
    const parser = new CategoryParser(connection);
    await parser.initData();
    await parser.updateCategoryToCases();
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
    module.exports.CategoryParser = CategoryParser;
}
