const chai = require("chai");
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const {LocationParser} = require('../parser/parseLocationOfHearing');

describe('parseLocationByCaseText', function () {
    it('should return right location', async function () {
        const parser = new LocationParser();
        const caseText = 'IN THE SUPREME COURT OF NEW ZEALAND\r\n' +
            '\n' +
            'SC 112/2018\n' +
            '[2019] NZSC 30\n' +
            'BETWEEN';
        const actual = parser.parseLocationByCaseText(caseText);
        const expected = 'NEW ZEALAND';
        expect(actual).to.eql(expected);
    });

    it('should return right location 2', async function () {
        const parser = new LocationParser();
        const caseText = 'IN THE SUPREME COURT OF NEW ZEALAND I TE KŌTI MANA NUI\r\n' +
            'SC 36/2018\n' +
            '[2018] NZSC 64';
        const actual = parser.parseLocationByCaseText(caseText);
        const expected = 'NEW ZEALAND I TE KŌTI MANA NUI';
        expect(actual).to.eql(expected);
    });

    it('should return right location 3', async function () {
        const parser = new LocationParser();
        const caseText = 'IN THE DISTRICT COURT AT AUCKLAND\r\n';
        const actual = parser.parseLocationByCaseText(caseText);
        const expected = 'AUCKLAND';
        expect(actual).to.eql(expected);
    });

    it('should return right location 4', async function () {
        const parser = new LocationParser();
        const caseText = 'IN THE COURT OF APPEAL OF NEW ZEALAND\n' +
            '    CA 745/2010 [2011] NZCA 514\n';
        const actual = parser.parseLocationByCaseText(caseText);
        const expected = 'NEW ZEALAND';
        expect(actual).to.eql(expected);
    });

    it('should return empty location', async function () {
        const parser = new LocationParser();
        const caseText = 'IN THE HIGH COURT';
        const actual = parser.parseLocationByCaseText(caseText);
        const expected = null;
        expect(actual).to.eql(expected);
    })
});

