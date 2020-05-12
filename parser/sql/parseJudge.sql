CREATE TABLE cases.judges
(
    id SERIAL,
    first_name text,
    last_name text NOT NULL,
    PRIMARY KEY(id)
);

CREATE TABLE cases.judge_titles
(
 id SERIAL,
 short_title TEXT,
 long_title TEXT,
 PRIMARY KEY(id),
 UNIQUE (short_title), 
 UNIQUE (long_title) 
);

INSERT INTO cases.judge_titles (short_title, long_title) VALUES 
('CJ',	'Chief Justice'),
('P',	'President of the Court of Appeal'),
('J',	'Justice (''Supreme Court, Court of Appeal, High Court'')'),
('JJ',	'Justices (''Supreme Court, Court of Appeal, High Court'')'),
('Associate Judge',	'Associate Judge'),
('Master',	'Master'),
('Judge',	'(''District Court'') Judge'),
('Chief Judge',	'Chief Judge of the Employment Court, Chief Judge of District Court, Chief Judge of Māori Land Court'),
('Principal Judge',	'Principal Family Court Judge, Principal Youth Court Judge and Principal Environment Judge')
ON CONFLICT DO NOTHING;

CREATE TABLE cases.judges_title_relation
(
    id SERIAL,
    judge_id integer,
    judge_title_id integer,
    PRIMARY KEY(id),
    FOREIGN KEY (judge_id) REFERENCES cases.judges (id),
    FOREIGN KEY (judge_title_id) REFERENCES cases.judge_titles (id)
);
