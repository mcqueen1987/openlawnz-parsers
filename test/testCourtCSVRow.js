const chai = require("chai");
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const {CourtCSVRow} = require('../parser/CourtCSVRow');

describe('importCourt', () => {
    it('should do nothing if acronym is empty', async () => {
        const courtData = {
            'court-name': 'name-no-abbr',
        };
        const row = new CourtCSVRow(null, courtData);
        await row.importCourt()
    });

    it('should `UPDATE` if the acronym exists', async () => {
        const courtData = {
            abbreviation: 'aaa',
            'court-name': 'name-A',
        };

        let actual = '';
        const connection = {
            none: (sql) => {
                actual = sql;
            },
            any: () => {
                return [{cnt: 1}]; // count > 0
            }
        };
        const row = new CourtCSVRow(connection, courtData);
        await row.importCourt()

        expect(actual).to.eql("UPDATE cases.courts SET court_name='name-A' where acronym='aaa'");
    });

    it('should `INSERT` if the acronym does not exist', async () => {
        const courtData = {
            abbreviation: 'bbb',
            'court-name': 'name-B',
        };

        let actual = '';
        const connection = {
            none: (sql) => {
                actual = sql;
            },
            any: () => {
                return [{cnt: 0}]; // count = 0
            }
        };
        const row = new CourtCSVRow(connection, courtData);
        await row.importCourt()
        expect(actual).to.eql("INSERT INTO cases.courts (acronym, court_name) VALUES ('bbb', 'name-B')");
    });
});

describe('importCitationAcronyms', () => {
    it('should execute correct insert/update SQL ', async function () {
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

        const courtWithId = [null, {id: 111}, {id: 222}];
        const counts = [1, 0];
        const actualSQLs = [];
        const connection = {
            none: (sql) => {
                actualSQLs.push(sql);
            },
            any: (sql) => {
                if (sql.indexOf('SELECT id') >= 0) {
                    return [courtWithId.shift()];
                }
                if (sql.indexOf('SELECT count(*)') >= 0) {
                    return [{cnt: counts.shift()}];
                }
            }
        };

        await Promise.all(courtsData.map(async row => {
            const court = new CourtCSVRow(connection, row);
            await court.importCitationAcronyms();
        }));
        const expectedSQLs = [
            "UPDATE cases.citation_acronyms SET court_id='111', law_report='report', category='cate-CountIs1' where acronym='CountIs1'",
            "INSERT INTO cases.citation_acronyms (acronym, court_id, law_report, category) VALUES ('CountIs0', '222', 'report', 'cate-CountIs0')"
        ];
        expect(actualSQLs).to.eql(expectedSQLs);
    });
});

describe('importCategory', () => {
    it('should execute correct insert/update SQL ', async function () {
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
        const connection = {
            none: (sql) => {
                actualSQLs.push(sql);
            },
            any: () => {
                called++;
                return [{cnt: counts.shift()}];
            }
        };

        await Promise.all(courtsData.map(async row => {
            const court = new CourtCSVRow(connection, row);
            await court.importCategory();
        }));

        const expectedSQLs = ["INSERT INTO cases.categories (category) VALUES ('bbb')"];
        expect(actualSQLs).to.eql(expectedSQLs);
        expect(called).to.eql(2);
    });
});