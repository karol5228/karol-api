const http = require('http');
const fs = require('fs');
const path = require('path');

const { eventLogger, metricas } = require('./bigdata/eventLogger');

const PORT = 3000;
const CSV = path.join(__dirname, 'data', 'clientes.csv');

function leerClientes() {
  const contenido = fs.readFileSync(CSV, 'utf8').trim();

  if (!contenido) {
    return [];
  }

  const lineas = contenido.split(/\r?\n/);

  return lineas.slice(1).map(linea => {
    const [id, nombre, correo] = linea.split(',');

    return {
      id: Number(id),
      nombre,
      correo
    };
  });
}

function guardarClientes(clientes) {
  const lineas = ['id,nombre,correo'];

  clientes.forEach(cliente => {
    lineas.push(
      `${cliente.id},${cliente.nombre},${cliente.correo}`
    );
  });

  fs.writeFileSync(CSV, lineas.join('\n') + '\n');
}

function responderJSON(res, estado, datos) {
  const cuerpo = JSON.stringify(datos);

  res.writeHead(estado, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo)
  });

  res.end(cuerpo);
}

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = '';

    req.on('data', parte => {
      cuerpo += parte;
    });

    req.on('end', () => {
      try {
        const datos = JSON.parse(cuerpo);
        resolve(datos);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {

  // FASE 4: registrar evento HTTP
  eventLogger(req, res);

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );

  const ruta = url.pathname;

  // FASE 3: página web
  if (req.method === 'GET' && ruta === '/') {
    const html = fs.readFileSync(
      path.join(__dirname, 'public', 'index.html')
    );

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.length
    });

    res.end(html);
    return;
  }

  // FASE 4: endpoint de prueba de eventos
  if (ruta === '/api/laboratorio/evento') {
    responderJSON(res, 200, {
      recibido: true,
      metodo: req.method
    });
    return;
  }

  // FASE 4: métricas de eventos
  if (
    req.method === 'GET' &&
    ruta === '/api/bigdata/metricas'
  ) {
    responderJSON(res, 200, {
      ...metricas,
      ahora: new Date().toISOString()
    });
    return;
  }

  // GET /api/clientes
  if (
    req.method === 'GET' &&
    ruta === '/api/clientes'
  ) {
    const clientes = leerClientes();

    responderJSON(res, 200, clientes);
    return;
  }

  // GET /api/clientes/:id
  if (
    req.method === 'GET' &&
    ruta.startsWith('/api/clientes/')
  ) {
    const id = Number(ruta.split('/').pop());
    const clientes = leerClientes();

    const cliente = clientes.find(c => c.id === id);

    if (!cliente) {
      responderJSON(res, 404, {
        error: 'Cliente no encontrado'
      });
      return;
    }

    responderJSON(res, 200, cliente);
    return;
  }

  // POST /api/clientes
  if (
    req.method === 'POST' &&
    ruta === '/api/clientes'
  ) {
    try {
      const datos = await leerBody(req);

      if (!datos.nombre || !datos.correo) {
        responderJSON(res, 400, {
          error: 'Nombre y correo son obligatorios'
        });
        return;
      }

      const clientes = leerClientes();

      const nuevoId = clientes.length > 0
        ? Math.max(...clientes.map(c => c.id)) + 1
        : 1;

      const nuevoCliente = {
        id: nuevoId,
        nombre: datos.nombre,
        correo: datos.correo
      };

      clientes.push(nuevoCliente);

      guardarClientes(clientes);

      responderJSON(res, 201, nuevoCliente);
    } catch (error) {
      responderJSON(res, 400, {
        error: 'JSON inválido'
      });
    }

    return;
  }

  // PUT /api/clientes/:id
  if (
    req.method === 'PUT' &&
    ruta.startsWith('/api/clientes/')
  ) {
    try {
      const id = Number(ruta.split('/').pop());
      const datos = await leerBody(req);

      const clientes = leerClientes();

      const posicion = clientes.findIndex(
        c => c.id === id
      );

      if (posicion === -1) {
        responderJSON(res, 404, {
          error: 'Cliente no encontrado'
        });
        return;
      }

      if (!datos.nombre || !datos.correo) {
        responderJSON(res, 400, {
          error: 'Nombre y correo son obligatorios'
        });
        return;
      }

      clientes[posicion] = {
        id,
        nombre: datos.nombre,
        correo: datos.correo
      };

      guardarClientes(clientes);

      responderJSON(res, 200, clientes[posicion]);
    } catch (error) {
      responderJSON(res, 400, {
        error: 'JSON inválido'
      });
    }

    return;
  }

  // DELETE /api/clientes/:id
  if (
    req.method === 'DELETE' &&
    ruta.startsWith('/api/clientes/')
  ) {
    const id = Number(ruta.split('/').pop());

    const clientes = leerClientes();

    const posicion = clientes.findIndex(
      c => c.id === id
    );

    if (posicion === -1) {
      responderJSON(res, 404, {
        error: 'Cliente no encontrado'
      });
      return;
    }

    const eliminado = clientes.splice(posicion, 1)[0];

    guardarClientes(clientes);

    responderJSON(res, 200, eliminado);
    return;
  }

  // Ruta no encontrada
  responderJSON(res, 404, {
    error: 'Ruta no encontrada'
  });
});

server.listen(PORT, () => {
  console.log(
    `Servidor escuchando en http://localhost:${PORT}`
  );
});