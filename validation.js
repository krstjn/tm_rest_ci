const users = require('./users');
const isISO8601 = require('validator/lib/isISO8601');

const isEmpty = s => s != null && !s;

async function validateUser({ username, password }, patch = false) {
  const validationMessages = [];

  // can't patch username
  if (!patch) {
    const m = 'Username is required, must be at least three letters and no more than 32 characters';
    if (typeof username !== 'string' || username.length < 3 || username.length > 32) {
      validationMessages.push({ field: 'username', message: m });
    }

    const user = await users.findByUsername(username);

    if (user) {
      validationMessages.push({
        field: 'username',
        message: 'Username is already registered',
      });
    }
  }

  if (!patch || password || isEmpty(password)) {
    if (typeof password !== 'string' || password.length < 6) {
      validationMessages.push({
        field: 'password',
        message: 'Password must be at least six letters',
      });
    }
  }

  return validationMessages;
}

function validateTournament({
  name,
  signUpExpiration,
} = {}, patch = false) {
  const errors = [];

  if (!patch || name || isEmpty(name)) {
    if ((typeof name !== 'string' || name.length === 0 || name.length > 255)) {
      errors.push({
        field: 'name',
        message: 'Name is required and must not be empty and no longer than 255 characters',
      });
    }
  }

  if (!isEmpty(signUpExpiration)) {
    if (typeof due !== 'string' || !isISO8601(signUpExpiration)) {
      errors.push({
        field: 'signUpExpiration',
        message: 'Has to be a valid date',
      });
    }
  }

  return errors;
}

module.exports = {
  validateUser,
  validateTournament,
};
