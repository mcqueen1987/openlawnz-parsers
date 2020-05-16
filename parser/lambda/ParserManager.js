const YearWorker = require('./YearWorker');

class ParserManager {
    constructor(caseId) {
        this.caseId = caseId;
    }

    queryCase() {
        // return a case's all related data
        this.case = { 'id': 1, 'caseText': 'test' };
    }

    buildTasks() {
        const yearWorker = new YearWorker(this.case)
        return [yearWorker];
    }

    process() {
        const tasks = this.buildTasks();
        tasks.forEach(task => {
            const data = task.parse();
            task.write(data);
        })
    }
}

module.exports = ParserManager;