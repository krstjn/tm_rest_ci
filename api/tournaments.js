const xss = require('xss');
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
  const matches = await query('SELECT * FROM matches WHERE tournamentid = $1', [id]);
  tournament.teams = teams.rows;
  tournament.matches = matches.rows;

  return tournament;
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
  const qm = 'SELECT * FROM matches WHERE tournamentId = $1';

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

  const updates = teams.map(async (team) => {
    return query(tq, [xss(team.name), tournament.id]);
  });

  const t = await Promise.all(updates);

  tournament.teams = t.map(r => r.rows[0]);
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
  res.status(501).json({ error: 'Not implemented yet' });
}

async function matchPatchRoute(req, res) {
  res.status(501).json({ error: 'Not implemented yet' });
}

async function startTournamentPostRoute(req, res) {
  res.status(501).json({ error: 'Not implemented yet' });
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
