const ParserManager = require('./ParserManager')

exports.handler = async (event) => {
    const worker = new ParserManager(event.caseId)
    worker.process()
}
