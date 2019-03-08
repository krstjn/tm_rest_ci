const express = require('express');
const passport = require('passport');
const { Strategy, ExtractJwt } = require('passport-jwt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const users = require('./users');
const { validateUser } = require('./validation');

const {
  JWT_SECRET: jwtSecret,
} = process.env;

if (!jwtSecret) {
  console.error('JWT_SECRET not registered in .env');
  process.exit(1);
}

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
};

async function strat(data, next) {
  const user = await users.findById(data.id);

  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
}

passport.use(new Strategy(jwtOptions, strat));

app.use(passport.initialize());

function requireAuth(req, res, next) {
  return passport.authenticate(
    'jwt',
    { session: false },
    (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const error = info && info.name === 'TokenExpiredError' ?
          'expired token' : 'invalid token';

        return res.status(401).json({ error });
      }

      req.user = user;
      return next();
    },
  )(req, res, next);
}

async function signupRoute(req, res) {
  const { username, password } = req.body;

  const validationMessage = await validateUser({ username, password });

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const result = await users.createUser(username, password);

  delete result.password;

  return res.status(201).json(result);
}

async function loginRoute(req, res) {
  const { username, password } = req.body;

  const user = await users.findByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'No such user' });
  }

  const passwordIsCorrect = await users.comparePasswords(password, user.password);

  if (passwordIsCorrect) {
    const payload = { id: user.id };
    const token = jwt.sign(payload, jwtOptions.secretOrKey);

    delete user.password;

    return res.json({
      user,
      token,
    });
  }

  return res.status(401).json({ error: 'Invalid password!' });
}

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

app.post('/signup', catchErrors(signupRoute));
app.post('/login', catchErrors(loginRoute));

module.exports = app;
module.exports.requireAuth = requireAuth;
