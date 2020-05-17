const YearWorker = require('./YearWorker');

class ParserManager {
    constructor(caseId) {
        this.caseId = caseId;
        this.queryCase()

        // field name need to be exported after parse
        this.exportFields = ['caseId'];
    }

    queryCase() {
        // fetch a full case from S3
        this.case = { 'id': 1, 'caseText': 'test' };
    }

    buildTasks() {
        const yearWorker = new YearWorker(this.case)
        return [yearWorker];
    }

    process() {
        const tasks = this.buildTasks();
        tasks.forEach(task => {
            task.process();
        });
    }

    export() {
        const caseJson = {}
        this.exportFields.forEach(field => {
            caseJson[field] = this.case[field];
        })
        return caseJson;
    }
}

module.exports = ParserManager;