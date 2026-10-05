const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
const CLIENTES_FILE = path.join(DATA_DIR, 'clientes.csv');
const EVENTOS_FILE = path.join(DATA_DIR, 'eventos.ndjson');

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(CLIENTES_FILE)) {
  fs.writeFileSync(
    CLIENTES_FILE,
    'id,nombre,correo\n1,Ana Ruiz,ana@example.com\n2,Luis Mora,luis@example.com\n3,Eva Paz,eva@example.com\n',
    'utf8'
  );
}

if (!fs.existsSync(EVENTOS_FILE)) {
  fs.writeFileSync(EVENTOS_FILE, '', 'utf8');
}

let contadorEventos = obtenerUltimoIdEvento();

function obtenerUltimoIdEvento() {
  try {
    const contenido = fs.readFileSync(EVENTOS_FILE, 'utf8').trim();

    if (!contenido) return 0;

    const lineas = contenido.split('\n');
    const ultimaLinea = JSON.parse(lineas[lineas.length - 1]);

    return Number(ultimaLinea.id) || 0;
  } catch {
    return 0;
  }
}

function enviarJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });

  res.end(JSON.stringify(data));
}

function obtenerBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

function leerClientes() {
  const contenido = fs.readFileSync(CLIENTES_FILE, 'utf8').trim();

  if (!contenido) return [];

  const lineas = contenido.split('\n').slice(1);

  return lineas
    .filter(linea => linea.trim() !== '')
    .map(linea => {
      const [id, nombre, correo] = linea.split(',');

      return {
        id: Number(id),
        nombre,
        correo
      };
    });
}

function guardarClientes(clientes) {
  const contenido = [
    'id,nombre,correo',
    ...clientes.map(
      cliente => `${cliente.id},${cliente.nombre},${cliente.correo}`
    )
  ].join('\n');

  fs.writeFileSync(CLIENTES_FILE, contenido + '\n', 'utf8');
}

function registrarEvento({
  tipo,
  fuente = 'backend',
  calidad = 'valido',
  detalle = {},
  duracion_ms = 0
}) {
  contadorEventos++;

  const evento = {
    id: contadorEventos,
    timestamp: new Date().toISOString(),
    tipo,
    fuente,
    calidad,
    duracion_ms,
    detalle
  };

  fs.appendFileSync(
    EVENTOS_FILE,
    JSON.stringify(evento) + '\n',
    'utf8'
  );

  return evento;
}

function leerEventos() {
  const contenido = fs.readFileSync(EVENTOS_FILE, 'utf8').trim();

  if (!contenido) return [];

  return contenido
    .split('\n')
    .filter(linea => linea.trim() !== '')
    .map(linea => JSON.parse(linea));
}

function generarDuracion() {
  const duracion = Math.floor(Math.random() * 500) + 20;

  // Aproximadamente 10% de eventos tendrán duración negativa
  if (Math.random() < 0.10) {
    return -duracion;
  }

  return duracion;
}

function generarEventoSintetico() {
  const tipos = [
    'visita_frontend',
    'click_interfaz',
    'busqueda',
    'cliente_creado',
    'cliente_editado',
    'cliente_eliminado',
    'api_listar_clientes'
  ];

  const tipo = tipos[Math.floor(Math.random() * tipos.length)];

  let detalle = {};

  if (tipo === 'busqueda') {
    const terminos = ['ana', 'luis', 'eva', 'maria', 'cliente'];

    detalle = {
      termino:
        terminos[Math.floor(Math.random() * terminos.length)],
      resultados: Math.floor(Math.random() * 5)
    };
  }

  if (tipo === 'click_interfaz') {
    detalle = {
      boton: 'generar_eventos'
    };
  }

  if (tipo === 'api_listar_clientes') {
    detalle = {
      resultados: leerClientes().length
    };
  }

  return registrarEvento({
    tipo,
    fuente: Math.random() > 0.5 ? 'frontend' : 'backend',
    calidad: 'valido',
    detalle,
    duracion_ms: generarDuracion()
  });
}

function calcularP95(valores) {
  if (valores.length === 0) return 0;

  const ordenados = [...valores].sort((a, b) => a - b);

  const posicion = Math.ceil(0.95 * ordenados.length) - 1;

  return ordenados[Math.max(0, posicion)];
}

function calcularAnalitica() {
  const eventos = leerEventos();

  const ahora = Date.now();

  const eventosUltimoMinuto = eventos.filter(evento => {
    const tiempoEvento = new Date(evento.timestamp).getTime();

    return ahora - tiempoEvento <= 60000;
  });

  const validos = eventos.filter(
    evento =>
      evento.calidad === 'valido' &&
      Number(evento.duracion_ms) >= 0
  );

  const sospechosos = eventos.filter(
    evento => Number(evento.duracion_ms) < 0
  );

  const tipos = {};

  validos.forEach(evento => {
    tipos[evento.tipo] = (tipos[evento.tipo] || 0) + 1;
  });

  let interaccionMasFrecuente = null;

  Object.entries(tipos).forEach(([tipo, cantidad]) => {
    if (
      !interaccionMasFrecuente ||
      cantidad > interaccionMasFrecuente.cantidad
    ) {
      interaccionMasFrecuente = {
        tipo,
        cantidad
      };
    }
  });

  const duracionesValidas = validos.map(evento =>
    Number(evento.duracion_ms)
  );

  const promedioDuracion =
    duracionesValidas.length > 0
      ? duracionesValidas.reduce((a, b) => a + b, 0) /
        duracionesValidas.length
      : 0;

  const porcentajeValidos =
    eventos.length > 0
      ? (validos.length / eventos.length) * 100
      : 0;

  return {
    total_eventos: eventos.length,
    eventos_ultimo_minuto: eventosUltimoMinuto.length,
    tipos_evento: Object.keys(tipos).length,
    eventos_validos: validos.length,
    eventos_sospechosos: sospechosos.length,
    porcentaje_validos: Number(porcentajeValidos.toFixed(2)),
    promedio_duracion_ms: Number(promedioDuracion.toFixed(2)),
    p95_duracion_ms: calcularP95(duracionesValidas),
    interaccion_mas_frecuente: interaccionMasFrecuente,
    valor: interaccionMasFrecuente
      ? `La interacción más frecuente es ${interaccionMasFrecuente.tipo} con ${interaccionMasFrecuente.cantidad} eventos válidos.`
      : 'Todavía no hay suficientes eventos para obtener valor.'
  };
}

const server = http.createServer(async (req, res) => {
  const inicio = Date.now();

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.end();
    return;
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  const ruta = url.pathname;

  try {
    // =========================
    // HEALTH
    // =========================

    if (
      req.method === 'GET' &&
      (ruta === '/' || ruta === '/health')
    ) {
      enviarJSON(res, 200, {
        ok: true,
        mensaje: 'Backend funcionando',
        puerto: PORT
      });

      return;
    }

    // =========================
    // CLIENTES - LISTAR
    // =========================

    if (
      req.method === 'GET' &&
      ruta === '/api/clientes'
    ) {
      const clientes = leerClientes();

      registrarEvento({
        tipo: 'api_listar_clientes',
        fuente: 'backend',
        detalle: {
          resultados: clientes.length
        },
        duracion_ms: Date.now() - inicio
      });

      enviarJSON(res, 200, clientes);

      return;
    }

    // =========================
    // CLIENTES - CREAR
    // =========================

    if (
      req.method === 'POST' &&
      ruta === '/api/clientes'
    ) {
      const body = await obtenerBody(req);

      if (!body.nombre || !body.correo) {
        enviarJSON(res, 400, {
          error: 'Nombre y correo son obligatorios'
        });

        return;
      }

      const clientes = leerClientes();

      const nuevoId =
        clientes.length > 0
          ? Math.max(...clientes.map(c => c.id)) + 1
          : 1;

      const nuevoCliente = {
        id: nuevoId,
        nombre: body.nombre,
        correo: body.correo
      };

      clientes.push(nuevoCliente);

      guardarClientes(clientes);

      registrarEvento({
        tipo: 'cliente_creado',
        fuente: 'backend',
        detalle: {
          id: nuevoId,
          nombre: body.nombre
        },
        duracion_ms: Date.now() - inicio
      });

      enviarJSON(res, 201, nuevoCliente);

      return;
    }

    // =========================
    // CLIENTES - EDITAR
    // =========================

    if (
      req.method === 'PUT' &&
      ruta.startsWith('/api/clientes/')
    ) {
      const id = Number(ruta.split('/').pop());

      const body = await obtenerBody(req);

      const clientes = leerClientes();

      const indice = clientes.findIndex(
        cliente => cliente.id === id
      );

      if (indice === -1) {
        enviarJSON(res, 404, {
          error: 'Cliente no encontrado'
        });

        return;
      }

      clientes[indice] = {
        id,
        nombre: body.nombre,
        correo: body.correo
      };

      guardarClientes(clientes);

      registrarEvento({
        tipo: 'cliente_editado',
        fuente: 'backend',
        detalle: {
          id
        },
        duracion_ms: Date.now() - inicio
      });

      enviarJSON(res, 200, clientes[indice]);

      return;
    }

    // =========================
    // CLIENTES - ELIMINAR
    // =========================

    if (
      req.method === 'DELETE' &&
      ruta.startsWith('/api/clientes/')
    ) {
      const id = Number(ruta.split('/').pop());

      const clientes = leerClientes();

      const cliente = clientes.find(
        c => c.id === id
      );

      if (!cliente) {
        enviarJSON(res, 404, {
          error: 'Cliente no encontrado'
        });

        return;
      }

      const nuevosClientes = clientes.filter(
        c => c.id !== id
      );

      guardarClientes(nuevosClientes);

      registrarEvento({
        tipo: 'cliente_eliminado',
        fuente: 'backend',
        detalle: {
          id
        },
        duracion_ms: Date.now() - inicio
      });

      enviarJSON(res, 200, {
        mensaje: 'Cliente eliminado',
        cliente
      });

      return;
    }

    // =========================
    // REGISTRAR EVENTO
    // =========================

    if (
      req.method === 'POST' &&
      ruta === '/api/eventos'
    ) {
      const body = await obtenerBody(req);

      const evento = registrarEvento({
        tipo: body.tipo || 'evento_desconocido',
        fuente: body.fuente || 'frontend',
        calidad: body.calidad || 'valido',
        detalle: body.detalle || {},
        duracion_ms:
          body.duracion_ms !== undefined
            ? Number(body.duracion_ms)
            : Date.now() - inicio
      });

      enviarJSON(res, 201, evento);

      return;
    }

    // =========================
    // CONSULTAR EVENTOS
    // =========================

    if (
      req.method === 'GET' &&
      ruta === '/api/eventos'
    ) {
      const limite =
        Number(url.searchParams.get('limite')) || 10;

      const eventos = leerEventos();

      const recientes = eventos
        .slice(-limite)
        .reverse();

      enviarJSON(res, 200, recientes);

      return;
    }

    // =========================
    // GENERAR EVENTOS
    // =========================

    if (
      req.method === 'POST' &&
      ruta === '/api/eventos/generar'
    ) {
      const body = await obtenerBody(req);

      let cantidad = Number(body.cantidad) || 100;

      cantidad = Math.min(
        Math.max(cantidad, 1),
        1000
      );

      const eventos = [];

      for (let i = 0; i < cantidad; i++) {
        eventos.push(generarEventoSintetico());
      }

      enviarJSON(res, 201, {
        mensaje: 'Eventos generados correctamente',
        cantidad: eventos.length,
        primer_evento: eventos[0],
        ultimo_evento: eventos[eventos.length - 1]
      });

      return;
    }

    // =========================
    // ANALÍTICA 5V
    // =========================

    if (
      req.method === 'GET' &&
      ruta === '/api/analitica/resumen'
    ) {
      const resumen = calcularAnalitica();

      enviarJSON(res, 200, resumen);

      return;
    }

    // =========================
    // RUTA NO ENCONTRADA
    // =========================

    enviarJSON(res, 404, {
      error: 'Ruta no encontrada'
    });

  } catch (error) {
    console.error(error);

    enviarJSON(res, 500, {
      error: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor HTTP ejecutándose en http://localhost:${PORT}`);
});