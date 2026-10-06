import http from 'node:http';
import { URL } from 'node:url';

// Users data

const users = new Map([
  [1, { id: 1, name: 'Amar', role: 'admin' }],
  [2, { id: 2, name: 'Harshit', role: 'member' }],
  [3, { id: 3, name: 'Harsh', role: 'member' }]
]);

let nextId = 4;

// Custom HTTP Error

class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

// Send JSON response

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers
  });

  if (status === 204) {
    res.end();
    return;
  }

  res.end(JSON.stringify(data));
}

// Read JSON body

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {

      // Empty body
      if (body.trim() === '') {
        resolve({});
        return;
      }

      try {
        const data = JSON.parse(body);
        resolve(data);
      } catch {
        reject(new HttpError(400, 'Invalid JSON'));
      }
    });

    req.on('error', () => {
      reject(new HttpError(400, 'Could not read request body'));
    });
  });
}

// Main request handler

async function handleRequest(req, res) {

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );

  const pathname = url.pathname;
  const method = req.method;

  // GET /users
  // GET /users?role=admin

  if (pathname === '/users' && method === 'GET') {

    const role = url.searchParams.get('role');

    let result = [...users.values()];

    if (role) {
      result = result.filter(user => user.role === role);
    }

    return sendJson(res, 200, result);
  }

  // POST /users

  if (pathname === '/users' && method === 'POST') {

    // Check Content-Type first
    const contentType = req.headers['content-type'] || '';

    if (!contentType.toLowerCase().startsWith('application/json')) {
      throw new HttpError(
        415,
        'Content-Type must be application/json'
      );
    }

    const body = await readJson(req);

    // Validate name
    if (
      typeof body.name !== 'string' ||
      body.name.trim() === ''
    ) {
      throw new HttpError(422, 'name is required');
    }

    const user = {
      id: nextId++,
      name: body.name.trim(),
      role: body.role ?? 'member'
    };

    users.set(user.id, user);

    return sendJson(res, 201, user);
  }


  // GET /users/:id

  const userMatch = pathname.match(/^\/users\/(\d+)$/);

  if (userMatch && method === 'GET') {

    const id = Number(userMatch[1]);

    const user = users.get(id);

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return sendJson(res, 200, user);
  }


  // DELETE /users/:id

  if (userMatch && method === 'DELETE') {

    const id = Number(userMatch[1]);

    if (!users.has(id)) {
      throw new HttpError(404, 'User not found');
    }

    users.delete(id);

    return sendJson(res, 204, null);
  }


  // Unsupported method on /users/:id
  // Example: PUT /users/1

  if (userMatch) {

    throw new HttpError(
      405,
      'Method Not Allowed',
      {
        Allow: 'GET, DELETE'
      }
    );
  }


  // Unsupported method on /users

  if (pathname === '/users') {

    throw new HttpError(
      405,
      'Method Not Allowed',
      {
        Allow: 'GET, POST'
      }
    );
  }

  // Route not found

  throw new HttpError(404, 'Route not found');
}


// Create HTTP server

const server = http.createServer(async (req, res) => {

  try {

    await handleRequest(req, res);

  } catch (error) {

    console.error(error);

    const status = error.status || 500;

    const message =
      error.message || 'Internal Server Error';

    sendJson(
      res,
      status,
      { error: message },
      error.headers || {}
    );
  }
});


// Start server

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});