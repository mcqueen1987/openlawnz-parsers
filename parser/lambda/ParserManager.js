const YearWorker = require('./YearWorker')

class ParserManager {
    constructor(caseId) {
        this.caseId = caseId
        this.queryCase()

        // field name need to be exported after parse
        this.exportFields = ['id', 'year']
    }

    queryCase() {
        // fetch a full case from S3
        this.case = { id: 1, caseText: 'test' }
    }

    buildTasks() {
        const yearWorker = new YearWorker(this.case, this)
        return [yearWorker]
    }

    process() {
        const tasks = this.buildTasks()
        tasks.forEach((task) => {
            task.process()
        })
    }

    export() {
        const caseJson = {}
        this.exportFields.forEach((field) => {
            caseJson[field] = this.case[field]
        })
        return caseJson
    }

    /**
     * do something when success
     */
    success(worker, message) {
        console.log(`[${worker}][case ${this.caseId}]success: ${message}`)
    }

    /**
     * do something when fail
     */
    fail(worker, message) {
        console.log(`[${worker}][case ${this.caseId}]fail: ${message}`)
    }

    /**
     * do something for other message
     */
    info(worker, message) {
        console.log(`[${worker}][case ${this.caseId}]info: ${message}`)
    }
}

module.exports = ParserManager
