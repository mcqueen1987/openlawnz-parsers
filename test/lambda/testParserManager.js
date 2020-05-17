const chai = require("chai");
chai.use(require("../lib/chai-things"));
const expect = chai.expect;
const ParserManager = require('../../parser/lambda/ParserManager');

describe('ParserManager', () => {
    it('constructor', async () => {
        const pm = new ParserManager(1);
        expect(pm.caseId).to.eql(1);
    });
    describe('buildTasks', () => {
        it('should contain right workers', () => {
            const pm = new ParserManager(1);
            const tasks = pm.buildTasks();
            expect(tasks.length).to.eq(1);

            // 0
            expect(tasks[0].type).to.eq('Year Worker');
        })
    });
    describe('export', () => {
        it('should only return json with `exportFields`', () => {
            const pm = new ParserManager(1);
            pm.case = {
                'include1': 'Hello',
                'include2': 'World',
                'exclude': 'Bye'
            };
            pm.exportFields = ['include1', 'include2'];
            expect(JSON.stringify(pm.export())).to.eq(JSON.stringify({
                'include1': 'Hello',
                'include2': 'World'
            }));
        })
    })
});