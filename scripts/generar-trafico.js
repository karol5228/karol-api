const base = process.argv[2] || 'http://localhost:3000';

const total = Number(process.argv[3] || 100);

const concurrencia = Number(process.argv[4] || 5);

if (
  !Number.isInteger(total) ||
  total < 1 ||
  total > 1000 ||
  !Number.isInteger(concurrencia) ||
  concurrencia < 1 ||
  concurrencia > 25
) {
  throw new Error('Usa TOTAL entre 1 y 1000 y concurrencia entre 1 y 25');
}

const metodos = ['GET', 'POST', 'PUT', 'DELETE'];

async function una(i) {
  const metodo = metodos[i % metodos.length];

  const ruta =
    i % 7 === 0
      ? '/api/clientes/999999'
      : '/api/laboratorio/evento';

  try {
    const r = await fetch(base + ruta, {
      method: metodo
    });

    await r.text();

    return String(r.status);
  } catch (e) {
    return 'ERROR_RED';
  }
}

async function main() {
  const conteo = {};

  const inicio = Date.now();

  for (let i = 0; i < total; i += concurrencia) {
    const lote = Array.from(
      { length: Math.min(concurrencia, total - i) },
      (_, j) => una(i + j)
    );

    for (const estado of await Promise.all(lote)) {
      conteo[estado] = (conteo[estado] || 0) + 1;
    }

    console.log(
      `Enviadas ${Math.min(i + concurrencia, total)}/${total}`
    );
  }

  const segundos = Math.max(
    (Date.now() - inicio) / 1000,
    0.001
  );

  console.log({
    total,
    segundos,
    porSegundo: total / segundos,
    conteo
  });
}

main().catch(console.error);