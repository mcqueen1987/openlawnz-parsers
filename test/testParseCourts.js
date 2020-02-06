const chai = require("chai");
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const {CourtParser} = require('../parser/parseCourts');

describe("getCourtNameByCaseText", function () {
    it("should return valid court name if found match", function () {
        const caseText = '\n' +
            'IN THE HIGH COURT OF NEW ZEALAND\n' +
            'HAMILTON REGISTRY\n' +
            'CIV-2011-419-1047\n' +
            '[2015] NZHC 587\n';
        const parser = new CourtParser();
        const courtName = parser.getCourtNameByCaseText(caseText);
        expect(courtName).equal('HIGH COURT');
    });
    it("should return null if no match found", function () {
        const caseText = '\n' +
            'IN THE HIGH xxx NEW ZEALAND\n' +
            'HAMILTON REGISTRY\n' +
            'CIV-2011-419-1047\n' +
            '[2015] NZHC 587\n';
        const parser = new CourtParser();
        const courtName = parser.getCourtNameByCaseText(caseText);
        expect(courtName).equal(null);
    });
});

describe('getCourtForUpdate', function () {
    it('should insert the new parsed court_name to `updatedCourts` if it\'s valid and didn\'t record ', async function () {
        const citationRow = {case_id: 50, citation: '[2019] NZHC 38'};
        const courts = [{id: 4, acronym: 'NZHC', court_name: ''}];
        const updatedCourts = {
            11: {id: 11, court_name: 'mock court name'}
        };
        const mockConnection = {
            any: (sql) => {
                return [{
                    case_text: 'IN THE HIGH COURT OF NEW ZEALAND\n' +
                        'HAMILTON REGISTRY\n' +
                        'CIV-2011-419-1047\n' +
                        '[2015] NZHC 587\n'
                }];
            }
        };
        const parser = new CourtParser(mockConnection);
        await parser.getCourtForUpdate(citationRow, courts, updatedCourts);
        const expectedCourt = {id: 4, court_name: 'HIGH COURT'}
        expect(JSON.stringify(updatedCourts[4])).equal(JSON.stringify(expectedCourt))
    });
    it('should not update the map if it has already been set', async function () {
        const citationRow = {case_id: 50, citation: '[2019] NZHC 38'};
        const courts = [{id: 4, acronym: 'NZHC', court_name: ''}];
        const updatedCourts = {
            4: {id: 4, court_name: 'HIGH COURT'}
        };
        let isCalled = 0;
        const mockConnection = {
            any: (sql) => {
                isCalled++;
                return [{
                    case_text: 'IN THE HIGH COURT OF NEW ZEALAND\n' +
                        'HAMILTON REGISTRY\n' +
                        'CIV-2011-419-1047\n' +
                        '[2015] NZHC 587\n'
                }];
            }
        };
        const parser = new CourtParser(mockConnection);
        await parser.getCourtForUpdate(citationRow, courts, updatedCourts);
        expect(isCalled).equal(0);
    })
});

describe('getAllCourtsNeedUpdate', function () {
    it('should generate the courts list for update correctly', async function () {
        const citations = [
            {case_id: 50, citation: '[2019] NZHC 38'}, // found court doesn't have name
            {case_id: 51, citation: '[2019] NZNO 38'}, // found court already has name
            {case_id: 52, citation: '[2019] NZNF 38'}, // cannot find court
        ];
        const courts = [
            {id: 4, acronym: 'NZHC', court_name: ''},
            {id: 5, acronym: 'NZNO', court_name: 'I have a name'},
        ];
        const mockConnection = {
            any: (sql) => {
                return [{
                    case_text: 'IN THE HIGH COURT OF NEW ZEALAND\n'
                }];
            }
        };
        const parser = new CourtParser(mockConnection);
        const actual = await parser.getAllCourtsNeedUpdate(citations, courts)
        const expected = { '4': { id: 4, court_name: 'HIGH COURT' } }
        expect(JSON.stringify(actual)).equal(JSON.stringify(expected))
    })

});

describe('getAllCourtToCasesSQLs', () => {
    it('should generate insert/update SQL correctly', async () => {
        let cnts = [2, 0];
        const citations = [
            {case_id: 50, citation: '[2019] NZHC 38'}, // found court with cnt = 2
            {case_id: 51, citation: '[2019] NZNO 38'}, // found court with cnt = 0
            {case_id: 52, citation: '[2019] NZNF 38'}, // cannot find court
        ];
        const courts = [
            {id: 4, acronym: 'NZHC', court_name: 'NZHC'},
            {id: 5, acronym: 'NZNO', court_name: 'NZNO'},
        ];
        const mockConnection = {
            any: (sql) => {
                return [{
                    cnt: cnts.shift()
                }];
            }
        };
        const parser = new CourtParser(mockConnection);
        const actual = await parser.getAllCourtToCasesSQLs(citations, courts);
        const expected = [
            "UPDATE cases.court_to_cases SET court_id='4' WHERE case_id='50'",
            "INSERT INTO cases.court_to_cases (court_id, case_id) VALUES ('5', '51')"
        ];
        expect(actual).to.eql(expected);
    })

});
