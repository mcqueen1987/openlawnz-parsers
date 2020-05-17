const chai = require("chai");
chai.use(require("../lib/chai-things"));
const expect = chai.expect;
const YearWorker = require('../../parser/lambda/YearWorker');

describe('YearWorkder', () => {
    it('should work', async () => {
        const caseItem = {
            citation:  '[2018] NZHC 1290 | 2018'
        }
        const mgr = {
            success: () => 1,
            fail: () => 1,
            info: () => 1,
        }
        const worker = new YearWorker(caseItem, mgr)
        worker.process()
        expect(worker.case.year).to.eq(2018)
    });
    it('should ignore', async () => {
        const caseItem = {
            citation:  'HC AK CIV 1999-404-000899'
        }
        const mgr = {
            success: () => 1,
            fail: () => 1,
            info: () => 1,
        }
        const worker = new YearWorker(caseItem, mgr)
        worker.process()
        expect(worker.case.year).to.be.undefined
    });
    it('should fail but set default', async () => {
        const caseItem = {
            citation:  'Hello world',
            case_date: '2019-03-21'
        }
        const mgr = {
            success: () => 1,
            fail: () => 1,
            info: () => 1,
        }
        const worker = new YearWorker(caseItem, mgr)
        worker.process()
        expect(worker.case.year).to.eq(2019)
    });
});