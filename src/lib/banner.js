import net from 'net';
import tls from 'tls';

const TLS_PORTS = new Set([443, 465, 636, 993, 995, 8443]);
const TIMEOUT = 5000;

export async function grabBanner(host, port) {
  const useTls = TLS_PORTS.has(port);

  return new Promise((resolve) => {
    let data = '';
    const options = { host, port, timeout: TIMEOUT };

    const socket = useTls
      ? tls.connect({ ...options, rejectUnauthorized: false }, () => {
          socket.write('HEAD / HTTP/1.0\r\n\r\n');
        })
      : net.createConnection(options, () => {
          // Some services send banner on connect, others need a probe
          socket.write('HEAD / HTTP/1.0\r\n\r\n');
        });

    socket.setEncoding('utf-8');
    socket.setTimeout(TIMEOUT);

    socket.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2048) {
        socket.destroy();
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('end', () => {
      resolve(data.trim() || null);
    });

    socket.on('close', () => {
      resolve(data.trim() || null);
    });

    socket.on('error', () => {
      resolve(null);
    });
  });
}

export async function grabBanners(host, ports) {
  const results = {};
  const promises = ports.map(async (port) => {
    const banner = await grabBanner(host, port);
    if (banner) {
      results[port] = banner;
    }
  });
  await Promise.allSettled(promises);
  return results;
}
