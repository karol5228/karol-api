const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3000;
const CSV_FILE = path.join(__dirname, 'data', 'clientes.csv');

let requestNumber = 0;

function readClients() {
    const content = fs.readFileSync(CSV_FILE, 'utf8').trim();

    if (!content) {
        return [];
    }

    const lines = content.split(/\r?\n/);
    const headers = lines[0].split(',');

    return lines.slice(1).filter(Boolean).map(line => {
        const values = line.split(',');
        const client = {};

        headers.forEach((header, index) => {
            client[header] = values[index] || '';
        });

        return client;
    });
}

function saveClients(clients) {
    const lines = [
        'id,nombre,correo',
        ...clients.map(client =>
            `${client.id},${client.nombre},${client.correo}`
        )
    ];

    fs.writeFileSync(CSV_FILE, lines.join('\n'));
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            resolve(body);
        });

        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    requestNumber++;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    console.log(
        `[${requestNumber}] ${method} ${pathname} | Origin: ${req.headers.origin || '-'}`
    );

    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });

        res.end();

        console.log(`[${requestNumber}] -> 204`);
        return;
    }

    try {
        if (method === 'GET' && (pathname === '/' || pathname === '/health')) {
            sendJSON(res, 200, {
                ok: true,
                mensaje: 'Backend funcionando',
                puerto: PORT
            });

            console.log(`[${requestNumber}] -> 200`);
            return;
        }

        if (method === 'GET' && pathname === '/api/clientes') {
            const clients = readClients();

            sendJSON(res, 200, clients);

            console.log(`[${requestNumber}] -> 200`);
            return;
        }

        const idMatch = pathname.match(/^\/api\/clientes\/(\d+)$/);

        if (idMatch) {
            const id = Number(idMatch[1]);
            const clients = readClients();
            const index = clients.findIndex(
                client => Number(client.id) === id
            );

            if (method === 'GET') {
                if (index === -1) {
                    sendJSON(res, 404, {
                        error: 'Cliente no encontrado'
                    });

                    console.log(`[${requestNumber}] -> 404`);
                    return;
                }

                sendJSON(res, 200, clients[index]);

                console.log(`[${requestNumber}] -> 200`);
                return;
            }

            if (method === 'PUT') {
                const body = await readBody(req);
                const data = JSON.parse(body);

                if (!data.nombre || !data.correo) {
                    sendJSON(res, 400, {
                        error: 'nombre y correo son obligatorios'
                    });

                    console.log(`[${requestNumber}] -> 400`);
                    return;
                }

                if (
                    String(data.nombre).includes(',') ||
                    String(data.nombre).includes('\n') ||
                    String(data.correo).includes(',') ||
                    String(data.correo).includes('\n')
                ) {
                    sendJSON(res, 400, {
                        error: 'No se permiten comas ni saltos de línea'
                    });

                    console.log(`[${requestNumber}] -> 400`);
                    return;
                }

                if (index === -1) {
                    sendJSON(res, 404, {
                        error: 'Cliente no encontrado'
                    });

                    console.log(`[${requestNumber}] -> 404`);
                    return;
                }

                clients[index] = {
                    id,
                    nombre: String(data.nombre).trim(),
                    correo: String(data.correo).trim()
                };

                saveClients(clients);

                sendJSON(res, 200, clients[index]);

                console.log(`[${requestNumber}] -> 200`);
                return;
            }

            if (method === 'DELETE') {
                if (index === -1) {
                    sendJSON(res, 404, {
                        error: 'Cliente no encontrado'
                    });

                    console.log(`[${requestNumber}] -> 404`);
                    return;
                }

                const deleted = clients.splice(index, 1)[0];

                saveClients(clients);

                sendJSON(res, 200, {
                    mensaje: 'Cliente eliminado',
                    cliente: deleted
                });

                console.log(`[${requestNumber}] -> 200`);
                return;
            }
        }

        if (method === 'POST' && pathname === '/api/clientes') {
            const body = await readBody(req);
            const data = JSON.parse(body);

            if (!data.nombre || !data.correo) {
                sendJSON(res, 400, {
                    error: 'nombre y correo son obligatorios'
                });

                console.log(`[${requestNumber}] -> 400`);
                return;
            }

            if (
                String(data.nombre).includes(',') ||
                String(data.nombre).includes('\n') ||
                String(data.correo).includes(',') ||
                String(data.correo).includes('\n')
            ) {
                sendJSON(res, 400, {
                    error: 'No se permiten comas ni saltos de línea'
                });

                console.log(`[${requestNumber}] -> 400`);
                return;
            }

            const clients = readClients();

            const newId =
                clients.length > 0
                    ? Math.max(...clients.map(client => Number(client.id))) + 1
                    : 1;

            const newClient = {
                id: newId,
                nombre: String(data.nombre).trim(),
                correo: String(data.correo).trim()
            };

            clients.push(newClient);

            saveClients(clients);

            sendJSON(res, 201, newClient);

            console.log(`[${requestNumber}] -> 201`);
            return;
        }

        sendJSON(res, 404, {
            error: 'Ruta no encontrada'
        });

        console.log(`[${requestNumber}] -> 404`);

    } catch (error) {
        console.error(error);

        sendJSON(res, 500, {
            error: 'Error interno del servidor'
        });

        console.log(`[${requestNumber}] -> 500`);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend funcionando en http://localhost:${PORT}`);
});