const SCHEMA = 'cases'
module.exports.Table = {
    CitationAcronyms: `${SCHEMA}.citation_acronyms`,
    Categories: `${SCHEMA}.categories`,
    CategoryToCases: `${SCHEMA}.category_to_cases`,
    CaseCitations: `${SCHEMA}.case_citations`,
    CourtToCases: `${SCHEMA}.court_to_cases`,
    Courts: `${SCHEMA}.courts`,
    Cases:`${SCHEMA}.cases`,
};
