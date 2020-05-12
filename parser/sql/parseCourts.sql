
CREATE TABLE IF NOT EXISTS cases.citation_acronyms ( 
    id SERIAL,
    acronym VARCHAR(16) NOT NULL,
    court_id INTEGER,
    law_report VARCHAR(255) DEFAULT NULL,
    category VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY(ID),
    FOREIGN KEY (court_id) REFERENCES cases.courts (id)
  );
CREATE TABLE IF NOT EXISTS cases.categories ( 
    id SERIAL,
    category VARCHAR(255) NOT NULL,
    PRIMARY KEY(id)
  );
CREATE TABLE IF NOT EXISTS cases.category_to_cases ( 
    id SERIAL,
    case_id INTEGER NOT NULL,
    category_id INTEGER DEFAULT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (case_id) REFERENCES cases.cases(id),
    FOREIGN KEY (category_id) REFERENCES cases.categories(id),
    unique (case_id, category_id)
  );
-- // todo n case_id to n category_id
-- modify following sql file and add what I have added and modified in sql files
-- echo "Downloading latest OpenLaw NZ database"
-- curl -o openlawnzdb.sql https://s3-ap-southeast-2.amazonaws.com/pgdump.openlaw.nz/latest.sql