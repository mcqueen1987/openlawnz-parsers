const chai = require("chai");
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const {CategoryParser} = require('../parser/parseCategory');

describe('updateCategoryToCases', function () {
    it('should execute correct insert SQL ', async function () {
        const parser = new CategoryParser();

        parser.citations = [
            {
                citation: '[2019] NNN 9/2011', // ignored: empty category in acronyms
                case_id: 50
            },
            {
                citation: '[2019] ERNZ 9/2011', // ignored: not ACC or NZACC
                case_id: 50
            },
            {
                citation: '[2019] ACC 9/2011',
                case_id: 51
            },
            {
                citation: '[2019] NZACC 9/2011',
                case_id: 52
            }];
        parser.acronyms = [
            {acronym: 'NNN', category: '', court_id: 16},
            {acronym: 'ERNZ', category: 'Employment', court_id: 17},
            {acronym: 'ACC', category: 'ACC', court_id: 18},
            {acronym: 'NZACC', category: 'NZACC', court_id: 19},
        ];
        parser.categories = [
            {category: 'NNN', id: 222},
            {category: 'Employment', id: 111},
            {category: 'ACC', id: 999},
            {category: 'NZACC', id: 888}
        ];

        const actualSQLs = [];
        parser.connection = {
            none: sql => actualSQLs.push(sql)
        };

        const expectedSQLs = [
            'INSERT INTO cases.category_to_cases (case_id, category_id) VALUES (51, 999) ON CONFLICT DO NOTHING ',
            'INSERT INTO cases.category_to_cases (case_id, category_id) VALUES (52, 888) ON CONFLICT DO NOTHING '
        ];
        await parser.updateCategoryToCases();
        expect(actualSQLs).to.eql(expectedSQLs);
    })

});