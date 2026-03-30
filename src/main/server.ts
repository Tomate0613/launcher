import net from 'node:net';
import dns from 'node:dns/promises';

/**
 * https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping
 */

export type LookupOptions = {
  host: string;
  port?: number;
  ping?: boolean;
  timeout?: number;
  srvLookup?: boolean;
};

export type ServerStatus = {
  version?: {
    name: string;
    protocol: number;
  };
  players?: {
    online: number;
    max: number;
    sample?: Array<{
      name: string;
      id: string;
    }>;
  };
  description?: unknown;
  favicon?: string;
};

export type LookupResult = {
  status: ServerStatus;
  latency: number;
};

/**
 * https://minecraft.wiki/w/Java_Edition_protocol/VarInt_and_VarLong
 */
function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];

  while ((value & ~0x7f) != 0) {
    bytes.push((value & 0x7f) | 0x80);

    value >>>= 7;
  }

  bytes.push(value);

  return Buffer.from(bytes);
}

/**
 * https://minecraft.wiki/w/Java_Edition_protocol/VarInt_and_VarLong
 */
function readVarInt(buffer: Buffer, offset = 0) {
  let numRead = 0;
  let result = 0;
  let read: number;

  do {
    read = buffer[offset + numRead];

    if (read === undefined) {
      throw new Error('Incomplete VarInt');
    }

    result |= (read & 0x7f) << (7 * numRead);

    numRead++;

    if (numRead > 5) {
      throw new Error('VarInt too big');
    }
  } while ((read & 0x80) !== 0);

  return {
    value: result,
    size: numRead,
  };
}

function writeString(value: string): Buffer {
  const data = Buffer.from(value, 'utf8');

  return Buffer.concat([writeVarInt(data.length), data]);
}

function createPacket(payload: Buffer): Buffer {
  return Buffer.concat([writeVarInt(payload.length), payload]);
}

/**
 * https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping#Handshake
 */
function handshakePacket(host: string, port: number): Buffer {
  return createPacket(
    Buffer.concat([
      writeVarInt(0x00),

      writeVarInt(-1),

      writeString(host),
      Buffer.from([port >> 8, port & 0xff]),

      writeVarInt(1),
    ]),
  );
}

/**
 * https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping#Status_Request
 */
function statusRequestPacket(): Buffer {
  return createPacket(writeVarInt(0x00));
}

/**
 * https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping#Ping_Request
 */
function pingPacket(time: bigint): Buffer {
  const buffer = Buffer.alloc(9);

  buffer.writeUInt8(0x01, 0);
  buffer.writeBigInt64BE(time, 1);

  return createPacket(buffer);
}

async function resolveSrv(host: string, port: number) {
  try {
    const records = await dns.resolveSrv(`_minecraft._tcp.${host}`);

    if (records.length) {
      const record = records.sort((a, b) => a.priority - b.priority)[0];

      return {
        host: record.name.replace(/\.$/, ''),
        port: record.port,
      };
    }
  } catch {}

  return {
    host,
    port,
  };
}

function connect(
  host: string,
  port: number,
  timeout: number,
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host,
      port,
    });

    socket.setTimeout(timeout);

    socket.once('connect', () => {
      resolve(socket);
    });

    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    socket.once('error', reject);
  });
}

async function readResponse(
  socket: net.Socket,
  timeout: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Response timeout'));
    }, timeout);

    const onData = (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);

      try {
        const length = readVarInt(buffer);

        const totalLength = length.size + length.value;

        if (buffer.length < totalLength) {
          // wait
          return;
        }

        clearTimeout(timer);
        socket.removeListener('data', onData);

        resolve(buffer.subarray(length.size, totalLength));
      } catch {
        // incomplete, wait
      }
    };

    socket.on('data', onData);

    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function lookup(options: LookupOptions): Promise<LookupResult> {
  const { host, port = 25565, timeout = 5000, srvLookup = true } = options;

  const target = srvLookup ? await resolveSrv(host, port) : { host, port };

  const socket = await connect(target.host, target.port, timeout);
  socket.write(handshakePacket(target.host, target.port));
  socket.write(statusRequestPacket());

  const response = await readResponse(socket, timeout);

  const packetId = readVarInt(response);

  if (packetId.value !== 0x00) {
    throw new Error('Invalid status response');
  }

  const jsonLength = readVarInt(response, packetId.size);

  const json = response
    .subarray(
      packetId.size + jsonLength.size,
      packetId.size + jsonLength.size + jsonLength.value,
    )
    .toString('utf8');

  const status: ServerStatus = JSON.parse(json);

  const start = Date.now();
  socket.write(pingPacket(BigInt(start)));
  await readResponse(socket, timeout);
  const latency = Date.now() - start;

  socket.end();

  return {
    status,
    latency,
  };
}
