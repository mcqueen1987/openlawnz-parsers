const {fetchCases} = require('./Case');
const {sqlSafeString} = require

const BATCH_SIZE = 500;

const run = async (connection) => {
    // fetch and handle cases by page
    let page = 0;
    while (true) {
        page ++;
        const cases = await fetchCases(connection, page, BATCH_SIZE);
        await Promise.all(cases.map(async (row) => {
             return row.parseAndUpdateFields([
                'appellant',
                'respondent',
                'appellant_appearance',
                'respondent_appearance',
                'claimant_age'
            ])
        }));
        // break when end
        if (cases.length < BATCH_SIZE) {
            break;
        }
    }
};

if (require.main === module) {
    // const argv = require('yargs').argv;
    const argv = {'env': 'local'};  // todo
    (async () => {
        try {
            const {connection} = await require('../common/setup')(argv.env);
            await run(connection);
        } catch (ex) {
            console.log(ex);
        }
    })().finally(process.exit);
} else {
    module.exports = run;
}


