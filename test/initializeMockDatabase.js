const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * create a mock schema and its tables, only copy the design of the schema without including the data
 *
 * @param database
 * @param oriSchemaName
 * @param mockSchemaName
 * @returns {Promise<void>}
 */
module.exports.initiateMockSchema = async function initiateMockSchema(database, oriSchemaName, mockSchemaName) {
    try {
        // drop mock schema if exists
        await exec(`docker exec -i openlawnz-postgres psql -U postgres -d ${database} -c "DROP SCHEMA IF EXISTS ${mockSchemaName} CASCADE"`);
        // built new mock schema in docker
        const {stdout, stderr} = await exec(`docker exec -i openlawnz-postgres pg_dump -U postgres --schema='${oriSchemaName}' -s ${database} | sed 's/${oriSchemaName}/${mockSchemaName}/g' | docker exec -i openlawnz-postgres psql -U postgres -d ${database}`);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    } catch (err) {
        console.error(err);
    }
};

/**
 * drop the mock schema and its tables
 *
 * @param database
 * @param mockSchema
 * @returns {Promise<void>}
 */
module.exports.dropMockSchema = async function dropMockSchema(database, mockSchema) {
    try {
        // drop mock schema in docker
        const {stdout, stderr} = await exec(`docker exec -i openlawnz-postgres psql -U postgres -d ${database} -c "DROP SCHEMA IF EXISTS ${mockSchema} CASCADE"`);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    } catch (err) {
        console.error(err);
    }
};

