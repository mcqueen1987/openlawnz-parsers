const chai = require("chai");
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const {CSVImporter} = require('../parser/importCsvToDb');

describe('importCsvToCourts', function () {
    it('should execute correct insert/update SQL ', async function () {
        const importer = new CSVImporter();
        const courtsData = [
            {
                'court-name': 'name-no-abbr',
            },
            {
                abbreviation: 'aaa',
                'court-name': 'name-A',
            },
            {
                abbreviation: 'bbb',
                'court-name': 'name-B',
            }
        ];

        const counts = [1, 0];
        const actualSQLs = [];
        importer.connection = {
            none: (sql) => {
                actualSQLs.push(sql);
            },
            any: () => {
                return [{cnt: counts.shift()}];
            }
        };


        const expectedSQLs = [
            "UPDATE cases.courts SET court_name='name-A' where acronym='aaa'",
            "INSERT INTO cases.courts (acronym, court_name) VALUES ('bbb', 'name-B')"
        ];
        await importer.importCsvToCourts(courtsData)
        expect(actualSQLs).to.eql(expectedSQLs);
    })
});

describe('importCsvToCategory', function () {
    it('should execute correct insert/update SQL ', async function () {

        const importer = new CSVImporter();
        const courtsData = [
            {
                NoCategory: 'I should be ignored',
            },
            {
                Category: 'aaa', // ignored by cnt > 0
            },
            {
                Category: 'bbb',
            }
        ];

        const counts = [1, 0];
        const actualSQLs = [];
        let called = 0;
        importer.connection = {
            none: (sql) => {
                actualSQLs.push(sql);
            },
            any: () => {
                called++;
                return [{cnt: counts.shift()}];
            }
        };

        await importer.importCsvToCategory(courtsData);
        const expectedSQLs = ["INSERT INTO cases.categories (category) VALUES ('bbb')"];
        expect(actualSQLs).to.eql(expectedSQLs);
        expect(called).to.eql(2);
    });
});

describe('importCsvToCitationAcronyms', function () {
    it('should execute correct insert/update SQL ', async function () {

        const importer = new CSVImporter();
        const courtsData = [
            {
                NoAbbreviation: 'I should be ignored',
            },
            {
                abbreviation: 'not found', // ignored by acronym no found
            },
            {
                abbreviation: 'CountIs1',  // update
                Category: 'cate-CountIs1',
                'law-report': 'report'
            },
            {
                abbreviation: 'CountIs0',  // insert
                Category: 'cate-CountIs0',
                'law-report': 'report'
            }
        ];

        const courtWithId = [ null, {id: 111}, {id: 222}];
        const counts = [1, 0];
        const actualSQLs = [];
        importer.connection = {
            none: (sql) => {
                actualSQLs.push(sql);
            },
            any: (sql) => {
                if(sql.indexOf('SELECT id') >= 0) {
                    return [courtWithId.shift()];
                }
                if(sql.indexOf('SELECT count(*)') >= 0) {
                    return [{cnt: counts.shift()}];
                }
            }
        };

        await importer.importCsvToCitationAcronyms(courtsData);
        const expectedSQLs = [
            "UPDATE cases.citation_acronyms SET court_id='111', law_report='report', category='cate-CountIs1' where acronym='CountIs1'",
            "INSERT INTO cases.citation_acronyms (acronym, court_id, law_report, category) VALUES ('CountIs0', '222', 'report', 'cate-CountIs0')"
        ];
        expect(actualSQLs).to.eql(expectedSQLs);
    });
});