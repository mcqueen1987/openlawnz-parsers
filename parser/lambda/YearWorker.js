/*******************************************************************/
/* Reuqired Fields:                                                */
/*     id                  => case.id                              */
/*     case_date           => case.case_date                       */
/*     citation.citation   => citation.citation                    */
/*******************************************************************/



/**
 * regex of Neutral Citation
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

class YearWorker {
    constructor(caseItem, manager) {
        this.case = caseItem;
        this.manager = manager;
    }

    get type() {
        return 'Year Worker';
    }

    // Entrance
    process() {
        if (!this.case.citation) {
            this.manager.fail(this.type, 'empty citation');
            return;
        }
        // 1. parse year from citation
        const year = this.parseNeutralCitation()
        if (year) {
            this.case.year = year;
            this.manager.success(this.type, 'set by citation');
            return
        }

        // 2. should ignore
        if (this.shouldExclude_CourtFilingNumbers() || this.shouldExclude_OtherCitations()) {
            this.manager.info(this.type, 'ignored');
            return;
        }

        // 3. default to year of the case_date if fail
        this.case.year = this.parseYearFromCaseDate();
        this.manager.fail(this.type, 'set by case_date ' + this.case.year)
    }

    // parse neutral citations
    parseNeutralCitation() {
        const matches = this.case.citation.match(regNeutralCitation);
        if (matches && matches[2]) {
            return parseInt(matches[2])
        }
        return null
    }

    shouldExclude_CourtFilingNumbers() {
        const matches = this.case.citation.match(regCourtFillingCitation);
        if (matches && matches[2]) {
            return true
        }
        return false
    }
    shouldExclude_OtherCitations() {
        const matches = this.case.citation.match(regOtherCitation);
        if (matches && matches[2]) {
            return true
        }
        return false
    }

    parseYearFromCaseDate() {
        return parseInt(this.case.case_date.substr(0, 4)) || undefined;
    }
}

module.exports = YearWorker
