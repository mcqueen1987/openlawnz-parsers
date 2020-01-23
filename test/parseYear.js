const {readFileSync} = require("fs");
const chai = require("chai");
chai.should();
chai.use(require("./lib/chai-things"));
const expect = chai.expect;
const {processCase} = require("../parser/parseYear");
const testCitations = readFileSync(__dirname + "/data/citation-year.txt", "utf8");

const expectedNeutralCitations = [
    '[2018] NZHC 1290 | 2018',
    '[2018] NZCA 180 | 2018',
    '(2015) 27 NZTC 22 | 2015',
    '[2016] 3 NZLR 36 (Coltart) | 2016',
    '[2016] NZSC 24 | 2016',
    '[2016] NZFLR 447 | 2016',
    '[2015] NZCCLR 11 (HC) | 2015',
    '[2016] 3 NZLR 36 (Coltart) | 2016',
    '(2015) 16 NZCPR 203 (CA) | 2015',
    '2018NZHC 22 | 2018',
    '[2017] NZAR 1614 | 2017',
    '(2015) 16 NZCPR 807 | 2015',
    '(2015) 14 TCLR 71 | 2015',
    '(2017) 127 IPR 318 | 2017',
    '(2015) 23 PRNZ 200 | 2015',
    '[2017] NZCCLR 24 | 2017',
    '[2018] NZACC 7 | 2018',
    '[2012] NZDC 12 at 6. | 2012',
    '[2012] NZCA 12 at 7. | 2012',
    '[2012] NZSC 12 at 8. | 2012',
    '[2012] NZEnvC 13 at 9. | 2012',
    '[2012] NZEmpC 13 at 10. | 2012',
    '[2012] NZACA 13 at 11. | 2012',
    '[2012] NZBSA 13 at 12. | 2012',
    '[2012] NZCC 13 at 13. | 2012',
    '[2012] NZCOP 13 at 14. | 2012',
    '[2012] NZCAA 13 at 15. | 2012',
    '[2012] NZDRT 13 at 16. | 2012',
    '[2012] NZHRRT 13 at [17] and [18]. | 2012',
    '[2012] NZIACDT 13 at 18 and 19. | 2012',
    '[2012] NZIEAA 13 at [19]-[20]. | 2012',
    '[2012] NZLVT 13 at [20] - [30]. | 2012',
    '[2012] NZLCDT 13 at [21] to [30]. | 2012',
    '[2012] NZLAT 13 at 22 to 30. | 2012',
    '[2012] NZSHD 13 at para [23], [35]. | 2012',
    '[2012] NZLLA 13 at para 24. | 2012',
    '[2012] NZMVDT 13 at [25], [26]. | 2012',
    '[2012] NZPSPLA 13 at [26]. | 2012',
    '[2012] NZREADT 13 at p27. | 2012',
    '[2012] NZSSAA 13 at p 28, 29. | 2012',
    '[2012] NZTRA 13 at 29 - 30. | 2012'
];

const expectedIgnoreCitations = [
    'HC AK CIV 1999-404-000899',
    'CIV 2007-404-004368',
    'CIV-2008-476-000072',
    'HC AK CIV 2007-404-004368',
    'HC TIM CIV 2007 476 581',
    'HC WN 2007-485-2533',
    'HC AK CIV.2007-404-7590',
    'HC WN CIV-2006-485-642',
    'HC WN CIV:  2006-485-1341',
    'HC CHCH 2007-409-000208',
    'HC TAU CIV -2010-470-357',
    'SC 80/2007',
    'S SC 20/2008',
    "SSC 8/2005'",
    'SCOA CA748/2012',
    'SCA650/2011',
    'SSC 101/2011'
];

const expectedFailedCitations = [
    'HC CHCH M198/00',
    'HC WHA S051000',
    'HC ROT CP8/02',
    'SC 13/04',
    'HC AK CIV 206-404-2913',
    'DC CA CA319/05'
];

describe("Parse Case Years", function () {
    it("Testing citation year regex", function () {
        // get data from txt file
        const citationsArr = testCitations.split("\n");
        const citationsOjb = citationsArr.map(item => {
            return {
                citation: item,
                case_date: ''
            }
        });
        // parse data
        const {neutralCitations, citationsToIgnore, failedCases} = processCase(citationsOjb);
        // test neutral citations
        const neutralCitationsArr = [];
        neutralCitations.forEach(item => {
            if (item['year']) {
                neutralCitationsArr.push(item.citation + ' | ' + item.year);
            }
        });
        expect(JSON.stringify(neutralCitationsArr)).equal(
            JSON.stringify(expectedNeutralCitations)
        );
        // test citations to ignore
        const citationsToIgnoreArr = [];
        citationsToIgnore.forEach(item => {
            citationsToIgnoreArr.push(item.citation);
        });
        expect(JSON.stringify(citationsToIgnoreArr)).equal(
            JSON.stringify(expectedIgnoreCitations)
        );
        // test failed citations
        const failedCasesArr = [];
        failedCases.forEach(item => {
            failedCasesArr.push(item.citation);
        });
        expect(JSON.stringify(failedCasesArr)).equal(
            JSON.stringify(expectedFailedCitations)
        );
    });
});
