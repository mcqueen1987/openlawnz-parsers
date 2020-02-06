/**
 * regex of Neutral Citation
 * todo: update the regex from the acronym in table cases.courts dynamically but not hard coding
 *
 * test/data/citation-year.txt iis the sample file of Neutral Citation
 */
const regNeutralCitation = /([\[|\(]?)(\d{4})([\]|\)]?)\s?(\d*\s)?(SC|RMA|NZELC|NZBLC|NZRA|NZCR|ERNZ|NZELR|IPR|NZCLC|NZRMA|CRNZ|FRNZ|ELRNZ|HRNZ|TCLR|NZAR|PRNZ|NZFLR|NZTRA|NZTR|NZTC|NZACC|ACC|NZDC|NZFC|NZHC|HC|NZCAA|NZCA|NZSC|NZEnvC|NZEmpC|NZACA|NZBSA|NZCCLR|NZCC|NZCOP|NZDRT|NZHRRT|NZIACDT|NZIPT|NZIEAA|NZLVT|NZLCDT|NZLAT|NZSHD|NZLLA|NZMVDT|NZPSPLA|NZREADT|NZSSAA|NZSAAA|NZLR|NZCPR)/;

/**
 * regex of Court Filing Numbers
 * Court Filing Numbers were parsed from ACC specifically and do not signify year of decision.
 * It was assigned when you file a case, might be a year or two or three before a judgment is issued,
 * so you could have court filing number CIV-2008 but the year of decision being 2010.
 * we don't parse year form Court Filing Numbers here. here we identify and filter it in order to get the unrecognized citations
 *
 * e.g
 * HC AK CIV 1999-404-000899
 * CIV 2007-404-004368
 * CIV-2008-476-000072
 * HC AK CIV 2007-404-004368
 * HC TIM CIV 2007 476 581
 * HC WN 2007-485-2533
 * HC AK CIV.2007-404-7590
 * HC WN CIV-2006-485-642
 * HC WN CIV:  2006-485-1341
 * HC CHCH 2007-409-000208
 * HC TAU CIV -2010-470-357
 */
const regCourtFillingCitation = /(CIV|CHCH|CRI|CIR|WN|AK|CIVP)[\s|\-|\.|:]*(\d{4})[\-|\s]/i;


/**
 * regex of the citations except neutral citation or court filing numbers,
 * not parse year from it.
 *
 * SC 80/2007
 * S SC 20/2008
 * SSC 8/2005'
 * SCOA CA748/2012
 * SCA650/2011
 * SSC 101/2011
 */
const regOtherCitation = /(?:SC|CA\w*)(\s\d{1,3})?[\/](\d{4})/;

// parse neutral citations
const parseNeutralCitation = (item) => {
    const matches = item['citation'].match(regNeutralCitation);
    if (matches && matches[2]) {
        return {
            'case_id': item['case_id'],
            'citation': item['citation'],
            'year': parseInt(matches[2])
        }
    }
};

const parseYearFromCaseDate = (item) => {
    return {
        'case_id': item['case_id'],
        'citation': item['citation'],
        'year': parseInt(item['case_date'].toString().substr(11, 4))
    }
};

// filter Court filing numbers
const filterCourtFilingNumbers = (item) => {
    const matches = item['citation'].match(regCourtFillingCitation);
    if (matches && matches[2]) {
        return {
            'case_id': item['case_id'],
            'citation': item['citation'],
        }
    }
};

// filter other cases
const filterOtherCitations = (item) => {
    const matches = item['citation'].match(regOtherCitation);
    if (matches && matches[2]) {
        return {
            'case_id': item['case_id'],
            'citation': item['citation'],
        }
    }
};

const processCase = (citations) => {
    // parse citations and get year
    const neutralCitations = [];
    const citationsToIgnore = [];
    // failed cases are the cases can not parse with regNeutralCitation / regCourtFillingCitation / regOtherCitation
    // and need to be checked manually then fix regCourtFillingCitation in condition that new citations were found
    const failedCases = [];
    citations.forEach((item) => {
        if (!item['citation']) {
            return;
        }
        const parsedNeutralCitation = parseNeutralCitation(item);
        if (parsedNeutralCitation) {
            neutralCitations.push(parsedNeutralCitation);
            return;
        }
        neutralCitations.push(parseYearFromCaseDate(item));
        // filter identified citations then we can get some unknown citations
        const parsedCourtFilingNumber = filterCourtFilingNumbers(item);
        if (parsedCourtFilingNumber) {
            citationsToIgnore.push(parsedCourtFilingNumber);
            return;
        }
        const parsedOtherCitation = filterOtherCitations(item);
        if (parsedOtherCitation) {
            citationsToIgnore.push(parsedOtherCitation);
            return;
        }
        failedCases.push(item);
    });
    return {neutralCitations, citationsToIgnore, failedCases}
};

const saveData = async (connection, pgPromise, neutralCitations) =>{
    // update data by chunk (recommended for performance):
    const caseCitationsColumnSet = new pgPromise.helpers.ColumnSet(
        ['?case_id', 'year', 'citation'],
        {table: {table: 'case_citations', schema: 'cases'}}
    );
    // e.g: update "cases"."case_citations" as t set "year"=v."year","citation"=v."citation" from (values(4974,2017,'(2017) 14 NZELR 584'),(4974,2017,'[2017] NZHC 1103')) as v("case_id","year","citation") WHERE v.case_id = t.case_id and v.citation = t.citation
    const updateMultiSql = pgPromise.helpers.update(neutralCitations, caseCitationsColumnSet) + ' WHERE v.case_id = t.case_id and v.citation = t.citation';
    await connection.none(updateMultiSql);
};

const run = async (connection, pgPromise) => {
    // get data from cases.case_citations and cases.cases
    const citations = await connection.any(
        'SELECT cit.case_id, cit.citation, cas.case_date ' +
        'FROM cases.case_citations AS cit ' +
        'INNER JOIN cases.cases AS cas ' +
        'ON cit.case_id = cas.id ' +
        'AND cit.year IS NULL');
    console.log(' get ' + citations.length + ' citations from cases.case_citations ');

    const {neutralCitations, citationsToIgnore, failedCases} = processCase(citations);

    console.log(
        ' Neutral citation: ' + neutralCitations.length +
        ' ; Citations to ignore: ' + citationsToIgnore.length +
        ' ; Failed parsing citations: ' + failedCases.length +
        ' ; \n citations failed to parse, should check it manually then check/modify the regex',
        failedCases
    );

    if (!neutralCitations.length) {
        console.log('no valid citation found, skip update');
        return;
    }

    await saveData(connection, pgPromise, neutralCitations);
};

if (require.main === module) {
    const argv = require('yargs').argv;
    (async () => {
        try {
            const {connection, pgPromise} = await require('../common/setup')(argv.env);
            await run(connection, pgPromise);
        } catch (ex) {
            console.log(ex);
        }
    })().finally(process.exit);
} else {
    module.exports = run;
    module.exports.regNeutralCitation = regNeutralCitation;
    module.exports.regCourtFillingCitation = regCourtFillingCitation;
    module.exports.regOtherCitation = regOtherCitation;
    module.exports.processCase = processCase;
}
