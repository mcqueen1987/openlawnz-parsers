const {fetchCases} = require('./Case');

const run = async (connection) => {
    const cases = await fetchCases(connection);
    // await Promise.all(
    //     cases.map(async (caseItem) => {
    //         await caseItem.parseAndUpdateField('appellant');
    //     })
    // );
    for(let i = 0; i < cases.length; i ++) {
        // await cases[i].parseAndUpdateField('appellant');
        // await cases[i].parseAndUpdateField('respondent');
        await cases[i].parseAndUpdateField('appellant_appearance');
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


