const bcrypt = require('bcrypt');
const { query, conditionalUpdate } = require('./db');
const xss = require('xss');

async function comparePasswords(password, hash) {
  const result = await bcrypt.compare(password, hash);

  return result;
}

async function findByUsername(username) {
  const q = 'SELECT * FROM users WHERE username = $1';

  const result = await query(q, [username]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

async function findById(id) {
  if (!Number.isInteger(Number(id))) {
    return null;
  }

  const q = 'SELECT * FROM users WHERE id = $1';

  const result = await query(q, [id]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

async function createUser(username, password, admin = false) {
  const hashedPassword = await bcrypt.hash(password, 11);

  const q = `
    INSERT INTO
      users (username, password, admin)
    VALUES
      ($1, $2, $3)
    RETURNING *`;

  const result = await query(q, [xss(username), hashedPassword, admin]);

  return result.rows[0];
}

async function updateUser(id, password, name) {
  if (!Number.isInteger(Number(id))) {
    return null;
  }

  const isset = f => typeof f === 'string' || typeof f === 'number';

  const fields = [
    isset(password) ? 'password' : null,
    isset(name) ? 'name' : null,
  ];

  let hashedPassword = null;

  if (password) {
    hashedPassword = await bcrypt.hash(password, 11);
  }

  const values = [
    hashedPassword,
    isset(name) ? xss(name) : null,
  ];

  const result = await conditionalUpdate('users', id, fields, values);

  if (!result) {
    return null;
  }

  return result.rows[0];
}

module.exports = {
  comparePasswords,
  findByUsername,
  findById,
  createUser,
  updateUser,
};
