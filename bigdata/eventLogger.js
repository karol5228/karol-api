const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ARCHIVO = path.join(
  __dirname,
  '..',
  'data',
  'raw',
  'eventos.csv'
);

const CABECERA = 'fecha,id,metodo,ruta,status,duracion_ms\n';

const metricas = {
  inicio: new Date().toISOString(),
  total: 0
};

function csv(valor) {
  return '"' + String(valor).replaceAll('"', '""') + '"';
}

function eventLogger(req, res) {
  const inicio = process.hrtime.bigint();
  const id = crypto.randomUUID();

  res.setHeader('X-Event-Id', id);

  res.on('finish', () => {
    const ms =
      Number(process.hrtime.bigint() - inicio) / 1e6;

    const ruta = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    ).pathname;

    const fila = [
      new Date().toISOString(),
      id,
      req.method,
      ruta,
      res.statusCode,
      ms.toFixed(2)
    ];

    try {
      fs.mkdirSync(path.dirname(ARCHIVO), {
        recursive: true
      });

      if (!fs.existsSync(ARCHIVO)) {
        fs.writeFileSync(ARCHIVO, CABECERA);
      }

      fs.appendFileSync(
        ARCHIVO,
        fila.map(csv).join(',') + '\n'
      );

      metricas.total++;

      console.log(
        `[DATO] ${id} ${req.method} ${ruta} -> ${res.statusCode}`
      );
    } catch (error) {
      console.error(
        '[DATO] No se pudo escribir el evento:',
        error
      );
    }
  });
}

module.exports = {
  eventLogger,
  metricas
};