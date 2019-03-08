CREATE TABLE users (
  id serial primary key,
  username varchar(64) unique NOT NULL,
  password varchar(255) NOT NULL,
  admin boolean default false,
  created timestamp with time zone not null default current_timestamp
);

CREATE TABLE tournaments (
  id serial primary key,
  name varchar(256) NOT NULL,
  created timestamp with time zone not null default current_timestamp,
  maxTeams integer,
  rounds integer default 2,
  signupexpiration timestamp with time zone default null,
  sport integer default 1,
  public boolean default true,
  userID integer NOT NULL REFERENCES users(id)
);

CREATE TABLE teams (
  id SERIAL primary key,
  name varchar(255),
  tournamentId integer REFERENCES tournaments(id)
);


CREATE TABLE matches (
  id serial primary key,
  awayTeamScore integer,
  homeTeamScore integer,
  location varchar(255),
  matchDate timestamp with time zone default null,
  played boolean default false,
  round integer not null,
  awayTeamId integer REFERENCES teams(id),
  homeTeamId integer REFERENCES teams(id),
  tournamentId integer REFERENCES tournaments(id)
);

CREATE TABLE subscriptions (
  id serial primary key,
  userid integer NOT NULL REFERENCES users(id),
  tournamentid integer NOT NULL REFERENCES tournaments(id),
  UNIQUE(userid, tournamentid)
);


