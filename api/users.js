const { paged, query, conditionalUpdate } = require('../db');

async function getProfile(user) {
  let q = 'SELECT * FROM tournaments WHERE userid = $1';

  const tournaments = await query(q, [user.id]);

  q = `SELECT s.id as subscriptionid, t.*
       FROM subscriptions s, tournaments t
       WHERE s.tournamentid = t.id AND s.userid = $1`;

  const subscriptions = await query(q, [user.id]);

  delete user.password; // eslint-disable-line

  return {
    user,
    tournaments: tournaments.rows,
    subscriptions: subscriptions.rows,
  };
}


async function userRoute(req, res) {
  const { user } = req;

  const data = await getProfile(user);

  return res.status(200).json(data);
}

module.exports = {
  getProfile,
  userRoute,
};
