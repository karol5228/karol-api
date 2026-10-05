import { useEffect, useState } from 'react';
import './App.css';

const API = `http://${window.location.hostname}:3000`;

function App() {
  const [clientes, setClientes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function request(path, options = {}) {
    console.log('[HTTP]', options.method || 'GET', API + path);

    const response = await fetch(API + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json();

    console.log('[HTTP]', response.status, data);

    if (!response.ok) {
      throw new Error(data.error || 'Error en la solicitud');
    }

    return data;
  }

  async function cargarClientes() {
    try {
      const data = await request('/api/clientes');
      setClientes(data);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  useEffect(() => {
    cargarClientes();
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
        body: JSON.stringify({ nombre, correo })
      });

      setNombre('');
      setCorreo('');
      setMensaje('Cliente agregado');

      await cargarClientes();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function editarCliente(cliente) {
    const nuevoNombre = prompt('Nuevo nombre:', cliente.nombre);
    const nuevoCorreo = prompt('Nuevo correo:', cliente.correo);

    if (!nuevoNombre || !nuevoCorreo) return;

    try {
      await request(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: nuevoNombre,
          correo: nuevoCorreo
        })
      });

      setMensaje('Cliente actualizado');
      await cargarClientes();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function eliminarCliente(id) {
    if (!confirm('¿Deseas eliminar este cliente?')) return;

    try {
      await request(`/api/clientes/${id}`, {
        method: 'DELETE'
      });

      setMensaje('Cliente eliminado');
      await cargarClientes();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  return (
    <main className="container">
      <h1>Gestión de Clientes</h1>

      <p className="info">
        Frontend: http://{window.location.host}
        <br />
        Backend: {API}
      </p>

      <form onSubmit={agregarCliente} className="form">
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <button type="submit">
          Agregar cliente
        </button>
      </form>

      {mensaje && <p className="mensaje">{mensaje}</p>}

      <section>
        <h2>Clientes</h2>

        {clientes.length === 0 ? (
          <p>No hay clientes.</p>
        ) : (
          <div className="lista">
            {clientes.map((cliente) => (
              <article className="cliente" key={cliente.id}>
                <div>
                  <strong>{cliente.nombre}</strong>
                  <p>{cliente.correo}</p>
                </div>

                <div className="acciones">
                  <button onClick={() => editarCliente(cliente)}>
                    Editar
                  </button>

                  <button onClick={() => eliminarCliente(cliente.id)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;