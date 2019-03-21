const xss = require('xss');
const robin = require('roundrobin');
const { paged, query, conditionalUpdate } = require('../db');
const { validateTournament } = require('../validation');
const { getProfile } = require('./users');


async function getTournament(id) {
  const result = await query(
    `
    SELECT
      *
    FROM tournaments
    WHERE id = $1
    `,
    [id],
  );

  if (result.rows.length === 0) {
    return { error: 'Tournament not found' };
  }

  const tournament = result.rows[0];

  const teams = await query('SELECT * FROM teams WHERE tournamentid = $1', [id]);
  const matches = await query('SELECT * FROM matches WHERE tournamentid = $1 ORDER BY round, matchDate', [id]);
  tournament.teams = teams.rows;
  tournament.matches = matches.rows;

  return tournament;
}

async function getTournamentOwner(id) {
  const result = await query(
    `
    SELECT
      userId, id, name
    FROM tournaments
    WHERE id = $1
    `,
    [id],
  );

  if (result.rowsCount === 0) {
    return { error: 'Tournament not found' };
  }

  return result.rows[0];
}

async function tournamentsRoute(req, res) {
  const { search = '' } = req.query;

  let q = `
    SELECT
      *
    FROM tournaments
  `;
  const values = [];

  if (typeof search === 'string' && search !== '') {
    q = `
      SELECT * FROM tournaments
      WHERE
        to_tsvector('english', name) @@ plainto_tsquery('english', $1)
    `;
    values.push(search);
  }

  const result = await query(q, values);

  const tournaments = result.rows;

  const qt = 'SELECT * FROM teams WHERE tournamentId = $1';
  const qm = 'SELECT * FROM matches WHERE tournamentId = $1 ORDER BY round';

  const teams = tournaments.map(async t => query(qt, [t.id]));
  const matches = tournaments.map(async t => query(qm, [t.id]));

  let t = await Promise.all(teams);
  let m = await Promise.all(matches);

  t = t.map(r => r.rows).filter(arr => arr.length !== 0);
  m = m.map(r => r.rows).filter(arr => arr.length !== 0);

  for (let i = 0; i < tournaments.length;) {
    let tf = false; let mf = false;
    for (let j = 0; j < t.length;) {
      if (tournaments[i].id === t[j][0].tournamentid) {
        tournaments[i].teams = t[j];
        tf = true;
        break;
      }
      j = j + 1; // eslint-disable-line
    }
    for (let j = 0; j < m.length;) {
      if (tournaments[i].id === m[j][0].tournamentid) {
        tournaments[i].matches = m[j];
        mf = true;
        break;
      }
      j = j + 1; // eslint-disable-line
    }
    if (!tf) tournaments[i].teams = [];
    if (!mf) tournaments[i].matches = [];
    i = i + 1; // eslint-disable-line
  }

  return res.json(tournaments);
}

async function tournamentsPostRoute(req, res) {
  const validationMessage = []; // validateTournament(req.body);

  const { name, signUpExpiration, maxTeams, isPublic, rounds, teams, sport } = req.body;
  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage, success: false });
  }
  const { user } = req;

  let teamsList = teams;
  if (typeof teams !== 'object' && typeof teams === 'string') {
    teamsList = teams.substr(1, teams.length - 2).split(',');
  }

  const columns = [
    'name',
    signUpExpiration ? 'signupexpiration' : null,
    maxTeams ? 'maxTeams' : null,
    rounds ? 'rounds' : null,
    isPublic ? 'public' : null,
    sport ? 'sport' : null,
    'userId',
  ].filter(Boolean);

  const values = [
    xss(name),
    signUpExpiration ? xss(signUpExpiration) : null,
    maxTeams ? Number(xss(maxTeams)) : null,
    rounds ? Number(xss(rounds)) : null,
    isPublic ? xss(isPublic) : null,
    sport ? xss(sport) : null,
    user.id,
  ].filter(Boolean);

  const params = values.map((_, i) => `$${i + 1}`);

  const q = `
    INSERT INTO tournaments (${columns.join(',')})
    VALUES (${params})
    RETURNING *`;

  const result = await query(q, values);


  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Error creating tournament' });
  }
  const tournament = result.rows[0];
  const tq = 'INSERT INTO teams (name, tournamentId) values ($1, $2) RETURNING *';

  const updates = teamsList.map(async team => query(tq, [xss(team.trim()), tournament.id]));

  const t = await Promise.all(updates);

  tournament.teams = t.map(r => r.rows[0]);
  tournament.matches = [];
  return res.status(201).json(tournament);
}

async function tournamentRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const tournament = await getTournament(id);
  if (tournament.error) {
    return res.status(404).json({ error: tournament.error });
  }

  return res.json(tournament);
}

async function addTeamRoute(req, res) {
  const { id } = req.params;

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'You need to provide a name' });
  }

  const q = 'INSERT INTO teams (name, tournamentId) values ($1, $2) RETURNING *';

  const team = await query(q, [xss(name), id]);

  return res.status(201).json(team);
}

async function subscribeRoute(req, res) {
  const { user } = req;

  const { id } = req.params;

  const q = 'INSERT INTO subscriptions(userid, tournamentid) values ($1, $2)';

  await query(q, [user.id, xss(id)]);

  const profile = await getProfile(user);

  res.status(200).json(profile);
}

async function tournamentPatchRoute(req, res) {
  const validationMessage = []; // validateTournament(req.body);
  const { id } = req.params;
  const { name, signUpExpiration, maxTeams, isPublic, rounds, sport } = req.body;
  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage, success: false });
  }
  const { user } = req;

  const owner = await getTournamentOwner(id);

  if (user.id !== owner.id && !user.admin) {
    return res.status(401).json({ error: 'Not authorized to edit this tournament' });
  }
  const updates = [
    name ? 'name' : null,
    signUpExpiration ? 'signupexpiration' : null,
    maxTeams ? 'maxTeams' : null,
    rounds ? 'rounds' : null,
    isPublic ? 'public' : null,
    sport ? 'sport' : null,
    'userId',
  ]
    .filter(Boolean)
    .map((field, i) => `${field} = $${i + 2}`);

  const filteredValues = [
    name ? xss(name) : null,
    signUpExpiration ? xss(signUpExpiration) : null,
    maxTeams ? Number(xss(maxTeams)) : null,
    rounds ? Number(xss(rounds)) : null,
    isPublic ? xss(isPublic) : null,
    sport ? xss(sport) : null,
    user.id,
  ].filter(Boolean);

  const values = [id, ...filteredValues];
  const q = `
    UPDATE tournaments
    SET ${updates} WHERE id = $1
    RETURNING *`;

  const result = await query(q, values);


  if (result.rowsCount === 0) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  const tournament = await getTournament(id);

  return res.status(200).json(tournament);

}

async function matchPatchRoute(req, res) {


  const validationMessage = []; // validateTournament(req.body);
  const { id, matchId } = req.params;
  const { awayTeamScore, homeTeamScore, location, played, round } = req.body;
  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage, success: false });
  }
  const { user } = req;

  const owner = await getTournamentOwner(id);

  if (user.id !== owner.id && !user.admin) {
    return res.status(401).json({ error: 'Not authorized to edit this tournament' });
  }

  const updates = [
    awayTeamScore ? 'awayTeamScore' : null,
    homeTeamScore ? 'homeTeamScore' : null,
    location ? 'location' : null,
    played ? 'played' : null,
    round ? 'round' : null,
  ]
    .filter(Boolean)
    .map((field, i) => `${field} = $${i + 3}`);

  const filteredValues = [
    awayTeamScore ? xss(awayTeamScore) : null,
    homeTeamScore ? xss(homeTeamScore) : null,
    location ? xss(location) : null,
    played ? xss(played) : null,
    round ? xss(round) : null,
  ].filter(Boolean);

  const values = [matchId, id, ...filteredValues];
  const q = `
    UPDATE matches
    SET ${updates} WHERE id = $1 AND tournamentid = $2
    RETURNING *`;

  const result = await query(q, values);


  if (result.rowsCount === 0) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  const tournament = await getTournament(id);

  return res.status(200).json(tournament);
}

async function startTournamentPostRoute(req, res) {
  const { id } = req.params;

  const tournament = await getTournament(id);

  if (tournament.matches.length > 0) {
    return res.status(400).json({ error: 'Tournament has already been started' });
  }

  const tl = tournament.teams.length;

  const round = robin(tl, tournament.teams);

  const matches = [];

  for(let i = 0; i < tournament.rounds; i++) { // eslint-disable-line
    for (let j = 0; j < round.length; j++) { // eslint-disable-line
      for(let r = 0; r < round[j].length; r++) { // eslint-disable-line
        const home = i % 2 === 0 ? round[j][r][0] : round[j][r][1];
        const away = i % 2 === 0 ? round[j][r][1] : round[j][r][0];
        const currentRound = (j + 1) + (i * tl);
        matches.push([home.id, home.name, away.id, away.name, currentRound, tournament.id]);
      }
    }
  }
  const q = `INSERT INTO matches(homeTeamId, homeTeamName, awayTeamId, awayTeamName, round, tournamentid)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;

  const inserts = matches.map(match => query(q, match));

  const m = await Promise.all(inserts);
  tournament.matches = m.map(r => r.rows[0]);
  return res.status(201).json(tournament);
}


module.exports = {
  getTournament,
  tournamentsRoute,
  tournamentsPostRoute,
  tournamentRoute,
  addTeamRoute,
  subscribeRoute,
  tournamentPatchRoute,
  matchPatchRoute,
  startTournamentPostRoute,
};
