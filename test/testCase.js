const chai = require("chai");
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const should = chai.should;
const {fetchCases, Case} = require('../parser/Case');

describe('fetchCases', () => {
    it('should select cases with pagination', async () => {
        let actualSQL = '';
        const conn = {
            any: (sql) => {
                actualSQL = sql;
                return [{id: 1, case_text: 'hahahah'}];
            }
        };
        const actual = await fetchCases(conn);
        const expectedSQL = 'SELECT * FROM cases.cases LIMIT 100 OFFSET 0';
        expect(actualSQL).to.eql(expectedSQL);
        expect(actual[0].id).to.eql(1);
        expect(actual[0].caseText).to.eql('hahahah');
    });
    it('should support pagination', async () => {
        let actualSQL = '';
        const conn = {
            any: (sql) => {
                actualSQL = sql;
                return [{id: 1, case_text: 'hahahah'}];
            }
        };
        await fetchCases(conn, 10, 20);
        const expectedSQL = 'SELECT * FROM cases.cases LIMIT 20 OFFSET 180';
        expect(actualSQL).to.eql(expectedSQL);

    })
});

describe('parseValueByRegPatterns', () => {
    it('should return first match', () => {
        const caseItem = new Case(null, {
            id: 1,
            case_text: '111abc'
        });
        const patterns = [
            '(A-Z)+',        // no match
            '([0-9]+)',      // first match
            '([0-9]+[a-z]+)' // ignored match
        ];
        expect(caseItem.parseValueByRegPatterns(patterns, '111abc')).to.eql('111');
    });
    it('should return null if no match', () => {
        const caseItem = new Case(null, {
            id: 1,
            case_text: '111abc'
        });
        const patterns = [
            '(A-Z)+',        // no match
            '([0-9]+[A-Z]+)' // no match
        ];
        expect(caseItem.parseValueByRegPatterns(patterns, '111abc')).to.eql(null);
    })
});

describe('parseFieldValue', () => {
    it('should work with callback function', () => {
        const caseItem = new Case(null, {
            id: 1,
            case_text: '111abc'
        });
        const parseFunc = () => {
            return 'testFunc'
        };
        expect(caseItem.parseFieldValue(parseFunc, '111abc')).to.eql('testFunc');
    });
    it('should work with single regex', () => {
        const caseItem = new Case(null, {
            id: 1,
            case_text: '111abc'
        });
        const pattern = '([0-9]+)';
        expect(caseItem.parseFieldValue(pattern, '111abc')).to.eql('111');
    });
    it('should work with multiple regex', () => {
        const caseItem = new Case(null, {
            id: 1,
            case_text: '111abc'
        });
        const patterns = [
            '(A-Z)+',        // no match
            '([0-9]+)',      // first match
            '([0-9]+[a-z]+)' // ignored match
        ];
        expect(caseItem.parseFieldValue(patterns, '111abc')).to.eql('111');
    });
});

describe('saveField', async () => {
    it('should execute SQL with `string`', () => {
        let actualSQL = '';
        const conn = {
            none: (sql) => {
                actualSQL = sql;
            }
        };
        const caseItem = new Case(conn, {id: 1, case_text: 'hahahah'});
        const expectedSQL = "UPDATE cases.cases SET testField = 'tttt' WHERE id = 1";
        caseItem.saveField('testField', 'string', 'tttt');
        expect(actualSQL).to.eql(expectedSQL);
    });
    it('should execute SQL with `number`', () => {
        let actualSQL = '';
        const conn = {
            none: (sql) => {
                actualSQL = sql;
            }
        };
        const caseItem = new Case(conn, {id: 1, case_text: 'hahahah'});
        const expectedSQL = "UPDATE cases.cases SET testField = 111 WHERE id = 1";
        caseItem.saveField('testField', 'number', 111);
        expect(actualSQL).to.eql(expectedSQL);
    });
});

describe('parseAndUpdateField', () => {
    it('should parse and save the field with value', async () => {
        let actualSQL = '';
        const conn = {
            none: (sql) => {
                actualSQL = sql;
            }
        };
        const caseItem = new Case(conn, {id: 1, case_text: 'hahahah'});
        let parseCalled = 0;
        let saveCalled = 0;
        caseItem.parseFieldValue = () => {
            parseCalled++;
            return 'YOYO';
        };
        caseItem.saveField = () => {
            saveCalled ++;
            return '';
        };
        caseItem.parseAndUpdateField('appellant');
        expect(parseCalled).to.eql(1);
        expect(saveCalled).to.eql(1);
    });
    it('should not save if no value parsed', async () => {
        let actualSQL = '';
        const conn = {
            none: (sql) => {
                actualSQL = sql;
            }
        };
        const caseItem = new Case(conn, {id: 1, case_text: 'hahahah'});
        let parseCalled = 0;
        let saveCalled = 0;
        caseItem.parseFieldValue = () => {
            parseCalled++;
            return null;
        };
        caseItem.saveField = () => {
            saveCalled ++;
            return '';
        };
        caseItem.parseAndUpdateField('appellant');
        expect(parseCalled).to.eql(1);
        expect(saveCalled).to.eql(0);
    })
});

describe('appellant', () => {
    it('should work 1', async () => {
        const caseItem = new Case(null, {id: 1, case_text: 'BETWEEN JOHN GARRY DAVIDOFF\r\nAppellant '});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('JOHN GARRY DAVIDOFF')
    });
    it('should work 2', async () => {
        const caseItem = new Case(null, {id: 1, case_text: 'C J Tennet for the Appellant'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('C J Tennet')
    });
    it('should work 3', async () => {
        const caseItem = new Case(null, {id: 1, case_text: '\nTHE QUEEN\n' +
                'v\n' +
                'TRACEY ANGELA FARROW'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('THE QUEEN')
    })
    it('should work 4', async () => {
        const caseItem = new Case(null, {id: 1, case_text: 'Registrar/Deputy Registrar\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                'CLAYTON v CLAYTON (Second Interim Judgment) [2014] NZHC 2528 [15 October 2014]\n' +
                '\n' +
                '[1] The first interim judgment on this application was issued on 18 September. For the reasons given the application was adjourned to 25 September.'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('CLAYTON')
    });
    it('should work 5', async () => {
        const caseItem = new Case(null, {id: 1, case_text: 'On 8 September 2014 the appellant, Razdan Rafiq, pre-emptively applied'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('Razdan Rafiq')
    });
    it('should work 6', async () => {
        const caseItem = new Case(null, {id: 1, case_text: '\nBODY CORPORATE 325261 v COOKE AND McDONOUGH & ORS [2014] NZHC 2306 [23 September 2014]'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('BODY CORPORATE 325261')
    });
    it('should work 7', async () => {
        const caseItem = new Case(null, {id: 1, case_text: '\nSMALL BUSINESS ACCOUNTING (NZ) LIMITED v SAJ RIDGE [2014] NZHC 2512 [14 October 2014]'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('SMALL BUSINESS ACCOUNTING (NZ) LIMITED')
    });
    it('should work 8', async () => {
        const caseItem = new Case(null, {id: 1, case_text: 'BETWEEN K\n' +
                'Appellant\n' +
                '\n' +
                'AND\tH\n' +
                'Respondent'});
        let actual = '';
        caseItem.saveField = (field, type, value ) => {
            actual = value;
            return '';
        };
        await caseItem.parseAndUpdateField('appellant');
        expect(actual).to.eql('K');
    });
});