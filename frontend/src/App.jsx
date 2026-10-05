import { useEffect, useState } from 'react';
import './App.css';

const API = `http://${window.location.hostname}:3000`;

function App() {
  const [clientes, setClientes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [resumen, setResumen] = useState(null);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [generando, setGenerando] = useState(false);

  async function request(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en la solicitud');
    }

    return data;
  }

  async function registrarEvento(tipo, detalle = {}) {
    try {
      await request('/api/eventos', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          fuente: 'frontend',
          calidad: 'valido',
          detalle
        })
      });
    } catch (error) {
      console.error('No se pudo registrar el evento:', error);
    }
  }

  async function cargarClientes() {
    try {
      const data = await request('/api/clientes');
      setClientes(data);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function cargarEventos() {
    try {
      const data = await request('/api/eventos?limite=10');
      setEventos(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function cargarResumen() {
    try {
      const data = await request('/api/analitica/resumen');
      setResumen(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function actualizarDashboard() {
    await Promise.all([
      cargarClientes(),
      cargarEventos(),
      cargarResumen()
    ]);
  }

  useEffect(() => {
    async function iniciarAplicacion() {
      await registrarEvento('visita_frontend');
      await actualizarDashboard();
    }

    iniciarAplicacion();
  }, []);

  async function agregarCliente(event) {
    event.preventDefault();

    if (!nombre || !correo) {
      setMensaje('Completa todos los campos');
      return;
    }

    try {
      await request('/api/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          correo
        })
      });

      setNombre('');
      setCorreo('');

      setMensaje('Cliente agregado correctamente');

      await actualizarDashboard();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function editarCliente(cliente) {
    const nuevoNombre = prompt(
      'Nuevo nombre:',
      cliente.nombre
    );

    const nuevoCorreo = prompt(
      'Nuevo correo:',
      cliente.correo
    );

    if (!nuevoNombre || !nuevoCorreo) {
      return;
    }

    try {
      await request(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: nuevoNombre,
          correo: nuevoCorreo
        })
      });

      setMensaje('Cliente actualizado');

      await actualizarDashboard();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function eliminarCliente(id) {
    if (!confirm('¿Deseas eliminar este cliente?')) {
      return;
    }

    try {
      await request(`/api/clientes/${id}`, {
        method: 'DELETE'
      });

      setMensaje('Cliente eliminado');

      await actualizarDashboard();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function buscar(event) {
    const valor = event.target.value;

    setBusqueda(valor);

    const resultados = clientes.filter(cliente =>
      cliente.nombre
        .toLowerCase()
        .includes(valor.toLowerCase()) ||
      cliente.correo
        .toLowerCase()
        .includes(valor.toLowerCase())
    );

    await registrarEvento('busqueda', {
      termino: valor,
      resultados: resultados.length
    });

    await cargarEventos();
    await cargarResumen();
  }

  async function generarEventos(cantidad) {
    try {
      setGenerando(true);

      setMensaje(`Generando ${cantidad} eventos...`);

      await registrarEvento('click_interfaz', {
        boton: `generar_${cantidad}`
      });

      const data = await request('/api/eventos/generar', {
        method: 'POST',
        body: JSON.stringify({
          cantidad
        })
      });

      setMensaje(
        `Se generaron ${data.cantidad} eventos correctamente`
      );

      await actualizarDashboard();
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setGenerando(false);
    }
  }

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase()) ||
    cliente.correo
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <main className="container">

      <header className="header">
        <h1>
          Laboratorio Big Data
        </h1>

        <p>
          Aplicación HTTP + generación y análisis de datos
        </p>
      </header>

      {mensaje && (
        <div className="mensaje">
          {mensaje}
        </div>
      )}

      <section className="dashboard">

        <h2>
          Dashboard de las 5V
        </h2>

        <div className="metricas">

          <div className="card">
            <h3>
              Volumen
            </h3>

            <strong>
              {resumen?.total_eventos ?? 0}
            </strong>

            <p>
              Eventos acumulados
            </p>
          </div>

          <div className="card">
            <h3>
              Velocidad
            </h3>

            <strong>
              {resumen?.eventos_ultimo_minuto ?? 0}
            </strong>

            <p>
              Eventos en el último minuto
            </p>
          </div>

          <div className="card">
            <h3>
              Variedad
            </h3>

            <strong>
              {resumen?.tipos_evento ?? 0}
            </strong>

            <p>
              Tipos de eventos
            </p>
          </div>

          <div className="card">
            <h3>
              Veracidad
            </h3>

            <strong>
              {resumen?.porcentaje_validos ?? 0}%
            </strong>

            <p>
              Eventos válidos
            </p>
          </div>

          <div className="card">
            <h3>
              Valor
            </h3>

            <strong>
              {resumen?.interaccion_mas_frecuente?.cantidad ?? 0}
            </strong>

            <p>
              Interacción más frecuente
            </p>
          </div>

        </div>

        {resumen && (
          <div className="valor">

            <h3>
              Interpretación del valor
            </h3>

            <p>
              {resumen.valor}
            </p>

          </div>
        )}

      </section>

      <section className="generador">

        <h2>
          Generador de eventos
        </h2>

        <p>
          Genera datos sintéticos para observar
          el comportamiento de las 5V.
        </p>

        <div className="botones">

          <button
            onClick={() => generarEventos(100)}
            disabled={generando}
          >
            Generar 100 eventos
          </button>

          <button
            onClick={() => generarEventos(500)}
            disabled={generando}
          >
            Generar 500 eventos
          </button>

        </div>

      </section>

      <section className="clientes">

        <h2>
          Gestión de clientes
        </h2>

        <form
          onSubmit={agregarCliente}
          className="form"
        >

          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />

          <input
            type="email"
            placeholder="Correo"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
          />

          <button type="submit">
            Agregar cliente
          </button>

        </form>

        <input
          className="busqueda"
          type="text"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={buscar}
        />

        <div className="lista">

          {clientesFiltrados.length === 0 ? (

            <p>
              No hay clientes que coincidan.
            </p>

          ) : (

            clientesFiltrados.map(cliente => (

              <article
                className="cliente"
                key={cliente.id}
              >

                <div>

                  <strong>
                    {cliente.nombre}
                  </strong>

                  <p>
                    {cliente.correo}
                  </p>

                </div>

                <div className="acciones">

                  <button
                    onClick={() => editarCliente(cliente)}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => eliminarCliente(cliente.id)}
                  >
                    Eliminar
                  </button>

                </div>

              </article>

            ))

          )}

        </div>

      </section>

      <section className="eventos">

        <h2>
          Últimos eventos RAW
        </h2>

        {eventos.length === 0 ? (

          <p>
            Todavía no hay eventos registrados.
          </p>

        ) : (

          <div className="tabla-contenedor">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Fuente</th>
                  <th>Calidad</th>
                  <th>Duración</th>
                </tr>

              </thead>

              <tbody>

                {eventos.map(evento => (

                  <tr key={evento.id}>

                    <td>
                      {evento.id}
                    </td>

                    <td>
                      {new Date(
                        evento.timestamp
                      ).toLocaleString()}
                    </td>

                    <td>
                      {evento.tipo}
                    </td>

                    <td>
                      {evento.fuente}
                    </td>

                    <td>
                      {evento.calidad}
                    </td>

                    <td>
                      {evento.duracion_ms} ms
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </main>
  );
}

export default App;