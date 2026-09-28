const http = require('http');
const fs = require('fs');

const archivo = 'datos.csv';
const PORT = 3001;

function leerDatos() {
    const contenido = fs.readFileSync(archivo, 'utf8');
    const lineas = contenido.trim().split('\n');

    const datos = [];

    for (let i = 1; i < lineas.length; i++) {
        const partes = lineas[i].split(',');

        datos.push({
            id: parseInt(partes[0]),
            nombre: partes[1],
            correo: partes[2],
            telefono: partes[3],
            ciudad: partes[4],
            edad: parseInt(partes[5])
        });
    }

    return datos;
}

function guardarDatos(datos) {
    let contenido = 'id,nombre,correo,telefono,ciudad,edad\n';

    datos.forEach(dato => {
        contenido += `${dato.id},${dato.nombre},${dato.correo},${dato.telefono},${dato.ciudad},${dato.edad}\n`;
    });

    fs.writeFileSync(archivo, contenido);
}

const servidor = http.createServer((req, res) => {

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // GET - Consultar usuarios
    if (req.method === 'GET' && req.url === '/datos') {

        const datos = leerDatos();

        res.writeHead(200);
        res.end(JSON.stringify(datos, null, 2));
    }

    // POST - Agregar usuario
    else if (req.method === 'POST' && req.url === '/datos') {

        let cuerpo = '';

        req.on('data', parte => {
            cuerpo += parte;
        });

        req.on('end', () => {

            const nuevoDato = JSON.parse(cuerpo);
            const datos = leerDatos();

            nuevoDato.id = datos.length + 1;

            datos.push(nuevoDato);

            guardarDatos(datos);

            res.writeHead(201);
            res.end(JSON.stringify(nuevoDato, null, 2));
        });
    }

    // PUT - Modificar usuario
    else if (req.method === 'PUT' && req.url.startsWith('/datos/')) {

        const id = parseInt(req.url.split('/')[2]);

        let cuerpo = '';

        req.on('data', parte => {
            cuerpo += parte;
        });

        req.on('end', () => {

            const datos = leerDatos();
            const dato = datos.find(d => d.id === id);

            if (!dato) {
                res.writeHead(404);
                res.end(JSON.stringify({
                    mensaje: 'Dato no encontrado'
                }));
                return;
            }

            const datosActualizados = JSON.parse(cuerpo);

            dato.nombre = datosActualizados.nombre;
            dato.correo = datosActualizados.correo;
            dato.telefono = datosActualizados.telefono;
            dato.ciudad = datosActualizados.ciudad;
            dato.edad = datosActualizados.edad;

            guardarDatos(datos);

            res.writeHead(200);
            res.end(JSON.stringify(dato, null, 2));
        });
    }

    // DELETE - Eliminar usuario
    else if (req.method === 'DELETE' && req.url.startsWith('/datos/')) {

        const id = parseInt(req.url.split('/')[2]);

        const datos = leerDatos();
        const posicion = datos.findIndex(d => d.id === id);

        if (posicion === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({
                mensaje: 'Dato no encontrado'
            }));
            return;
        }

        const eliminado = datos.splice(posicion, 1);

        guardarDatos(datos);

        res.writeHead(200);
        res.end(JSON.stringify(eliminado[0], null, 2));
    }

    // Ruta no encontrada
    else {

        res.writeHead(404);

        res.end(JSON.stringify({
            mensaje: 'Ruta no encontrada'
        }));
    }
});

servidor.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});