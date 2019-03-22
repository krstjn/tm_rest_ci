const express = require('express');
const { requireAuth } = require('../auth');

const router = express.Router();

const {
  tournamentsRoute,
  tournamentRoute,
  tournamentDeleteRoute,
  tournamentsPostRoute,
  addTeamRoute,
  subscribeRoute,
  unsubscribeRoute,
  tournamentPatchRoute,
  matchPatchRoute,
  startTournamentPostRoute,
} = require('./tournaments');

const {
  userRoute,
} = require('./users');


function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function indexRoute(req, res) {
  return res.json({
    authentication: {
      signup: '/signup',
      login: '/login',
    },
    tournaments: {
      tournaments: '/tournaments',
      tournament: '/tournaments/{id}',
      addTeam: '/tournaments/{id}/team',
      subscribe: '/tournaments/{id}/sub',
      edit: '/tournaments/{id}/edit',
      editMatch: '/tournaments/{id}/match/{matchid}',
      start: '/tournaments/{id}/start',
    },
    user: {
      profile: '/profile',
    },
  });
}

router.get('/', indexRoute);

router.get('/profile', requireAuth, catchErrors(userRoute));
router.get('/tournaments', catchErrors(tournamentsRoute));
router.post('/tournaments', requireAuth, catchErrors(tournamentsPostRoute));
router.get('/tournaments/:id', catchErrors(tournamentRoute));
router.delete('/tournaments/:id', requireAuth, catchErrors(tournamentDeleteRoute));
router.post('/tournaments/:id/team', requireAuth, catchErrors(addTeamRoute));
router.post('/tournaments/:id/sub', requireAuth, catchErrors(subscribeRoute));
router.delete('/tournaments/:id/sub', requireAuth, catchErrors(unsubscribeRoute));
router.post('/tournaments/:id/start', requireAuth, catchErrors(startTournamentPostRoute));
router.patch('/tournaments/:id/edit', requireAuth, catchErrors(tournamentPatchRoute));
router.patch('/tournaments/:id/match/:matchId', requireAuth, catchErrors(matchPatchRoute))

module.exports = router;
