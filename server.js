const http = require('http');
const fs = require('fs');

const PORT = 3001;

const server = http.createServer((req, res) => {

  if (req.url === '/usuarios' && req.method === 'GET') {

    fs.readFile('datos.csv', 'utf8', (err, data) => {

      if (err) {
        res.writeHead(500, {
          'Content-Type': 'text/plain; charset=utf-8'
        });

        res.end('Error al leer los datos');
        return;
      }

      const filas = data.trim().split('\n');

      const encabezados = filas[0].split(',');

      const usuarios = filas.slice(1).map(fila => {
        const valores = fila.split(',');

        let usuario = {};

        encabezados.forEach((encabezado, index) => {
          usuario[encabezado] = valores[index];
        });

        return usuario;
      });

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8'
      });

      res.end(JSON.stringify(usuarios, null, 2));
    });

  } else {

    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end('Ruta no encontrada');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});