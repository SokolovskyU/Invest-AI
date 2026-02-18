import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_DIR = path.resolve("proto");
const USERS_PROTO = path.join(PROTO_DIR, "users.proto");
const OPERATIONS_PROTO = path.join(PROTO_DIR, "operations.proto");
const INSTRUMENTS_PROTO = path.join(PROTO_DIR, "instruments.proto");
const MARKETDATA_PROTO = path.join(PROTO_DIR, "marketdata.proto");

export type UsersServiceClient = grpc.Client & {
  GetAccounts: (
    request: Record<string, never>,
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
};

export type OperationsServiceClient = grpc.Client & {
  GetOperations: (
    request: {
      account_id: string;
      from: { seconds: string | number; nanos: number };
      to: { seconds: string | number; nanos: number };
      state?: string;
    },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  GetPortfolio: (
    request: { account_id: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  GetOperationsByCursor: (
    request: {
      account_id: string;
      from?: { seconds: string | number; nanos: number };
      to?: { seconds: string | number; nanos: number };
      cursor?: string;
      limit?: number;
      state?: string;
      without_trades?: boolean;
    },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
};

export type InstrumentsServiceClient = grpc.Client & {
  GetInstrumentBy: (
    request: { id_type: string; id: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  BondBy: (
    request: { id_type: string; id: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  Shares: (
    request: { instrument_status?: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  Etfs: (
    request: { instrument_status?: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  Currencies: (
    request: { instrument_status?: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  Bonds: (
    request: { instrument_status?: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  Futures?: (
    request: { instrument_status?: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  Options?: (
    request: { instrument_status?: string },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  GetBondCoupons: (
    request: {
      figi: string;
      from: { seconds: string | number; nanos: number };
      to: { seconds: string | number; nanos: number };
    },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  GetDividends: (
    request: {
      figi: string;
      from: { seconds: string | number; nanos: number };
      to: { seconds: string | number; nanos: number };
    },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
};

export type MarketDataServiceClient = grpc.Client & {
  GetLastPrices: (
    request: { instrument_id?: string[]; figi?: string[] },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  GetClosePrices: (
    request: { instruments: Array<{ instrument_id: string }> },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
  GetCandles?: (
    request: {
      instrument_id: string;
      from: { seconds: string | number; nanos: number };
      to: { seconds: string | number; nanos: number };
      interval: string;
    },
    metadata: grpc.Metadata,
    callback: (err: grpc.ServiceError | null, response: unknown) => void
  ) => void;
};

const packageDefinitionCache = new Map<string, protoLoader.PackageDefinition>();
const grpcObjectCache = new Map<string, grpc.GrpcObject>();
const serviceConstructorCache = new Map<string, any>();
const clientCache = new Map<string, grpc.Client>();

function getUseInsecure(): boolean {
  const useInsecure =
    process.env.TINVEST_INSECURE?.trim().toLowerCase() === "true";
  return useInsecure;
}

function loadProto(protoPath: string): protoLoader.PackageDefinition {
  const cached = packageDefinitionCache.get(protoPath);
  if (cached) return cached;
  const loaded = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  packageDefinitionCache.set(protoPath, loaded);
  return loaded;
}

function loadGrpcObject(protoPath: string): grpc.GrpcObject {
  const cached = grpcObjectCache.get(protoPath);
  if (cached) return cached;
  const packageDefinition = loadProto(protoPath);
  const loaded = grpc.loadPackageDefinition(packageDefinition);
  grpcObjectCache.set(protoPath, loaded);
  return loaded;
}

function createCredentials() {
  const useInsecure = getUseInsecure();
  return useInsecure
    ? grpc.credentials.createSsl(undefined, undefined, undefined, {
        rejectUnauthorized: false,
      })
    : grpc.credentials.createSsl();
}

function getServiceConstructor<TClient extends grpc.Client>(
  serviceKey: string,
  protoPath: string,
  resolver: (proto: any) => new (
    address: string,
    credentials: grpc.ChannelCredentials
  ) => TClient
): new (address: string, credentials: grpc.ChannelCredentials) => TClient {
  const cached = serviceConstructorCache.get(serviceKey);
  if (cached) return cached;
  const proto = loadGrpcObject(protoPath) as any;
  const Service = resolver(proto);
  serviceConstructorCache.set(serviceKey, Service);
  return Service;
}

function getClientCacheKey(serviceName: string, endpoint: string): string {
  const insecureFlag = getUseInsecure() ? "insecure" : "secure";
  return `${serviceName}:${endpoint}:${insecureFlag}`;
}

function getOrCreateClient<TClient extends grpc.Client>(
  serviceName: string,
  endpoint: string,
  constructorFactory: () => new (
    address: string,
    credentials: grpc.ChannelCredentials
  ) => TClient
): TClient {
  const key = getClientCacheKey(serviceName, endpoint);
  const cached = clientCache.get(key);
  if (cached) return cached as TClient;
  const Service = constructorFactory();
  const created = new Service(endpoint, createCredentials());
  clientCache.set(key, created);
  return created;
}

export function createUsersClient(endpoint: string): UsersServiceClient {
  return getOrCreateClient("UsersService", endpoint, () =>
    getServiceConstructor<UsersServiceClient>(
      "UsersService",
      USERS_PROTO,
      (proto) => proto.tinkoff.public.invest.api.contract.v1.UsersService
    )
  );
}

export function createOperationsClient(
  endpoint: string
): OperationsServiceClient {
  return getOrCreateClient("OperationsService", endpoint, () =>
    getServiceConstructor<OperationsServiceClient>(
      "OperationsService",
      OPERATIONS_PROTO,
      (proto) => proto.tinkoff.public.invest.api.contract.v1.OperationsService
    )
  );
}

export function createInstrumentsClient(
  endpoint: string
): InstrumentsServiceClient {
  return getOrCreateClient("InstrumentsService", endpoint, () =>
    getServiceConstructor<InstrumentsServiceClient>(
      "InstrumentsService",
      INSTRUMENTS_PROTO,
      (proto) => proto.tinkoff.public.invest.api.contract.v1.InstrumentsService
    )
  );
}

export function createMarketDataClient(
  endpoint: string
): MarketDataServiceClient {
  return getOrCreateClient("MarketDataService", endpoint, () =>
    getServiceConstructor<MarketDataServiceClient>(
      "MarketDataService",
      MARKETDATA_PROTO,
      (proto) => proto.tinkoff.public.invest.api.contract.v1.MarketDataService
    )
  );
}

export function closeGrpcClients(): void {
  for (const client of clientCache.values()) {
    try {
      client.close();
    } catch {
      // ignore close errors during shutdown
    }
  }
  clientCache.clear();
}

export function buildAuthMetadata(token: string, appName?: string): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Bearer ${token}`);
  if (appName && appName.trim().length > 0) {
    metadata.set("x-app-name", appName.trim());
  }
  return metadata;
}
