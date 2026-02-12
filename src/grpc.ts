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
};

function loadProto(protoPath: string) {
  return protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
}

function createCredentials() {
  const useInsecure =
    process.env.TINVEST_INSECURE?.trim().toLowerCase() === "true";
  return useInsecure
    ? grpc.credentials.createSsl(undefined, undefined, undefined, {
        rejectUnauthorized: false,
      })
    : grpc.credentials.createSsl();
}

export function createUsersClient(endpoint: string): UsersServiceClient {
  const packageDefinition = loadProto(USERS_PROTO);
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const UsersService =
    proto.tinkoff.public.invest.api.contract.v1.UsersService;

  return new UsersService(endpoint, createCredentials()) as UsersServiceClient;
}

export function createOperationsClient(
  endpoint: string
): OperationsServiceClient {
  const packageDefinition = loadProto(OPERATIONS_PROTO);
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const OperationsService =
    proto.tinkoff.public.invest.api.contract.v1.OperationsService;

  return new OperationsService(
    endpoint,
    createCredentials()
  ) as OperationsServiceClient;
}

export function createInstrumentsClient(
  endpoint: string
): InstrumentsServiceClient {
  const packageDefinition = loadProto(INSTRUMENTS_PROTO);
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const InstrumentsService =
    proto.tinkoff.public.invest.api.contract.v1.InstrumentsService;

  return new InstrumentsService(
    endpoint,
    createCredentials()
  ) as InstrumentsServiceClient;
}

export function createMarketDataClient(
  endpoint: string
): MarketDataServiceClient {
  const packageDefinition = loadProto(MARKETDATA_PROTO);
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const MarketDataService =
    proto.tinkoff.public.invest.api.contract.v1.MarketDataService;

  return new MarketDataService(
    endpoint,
    createCredentials()
  ) as MarketDataServiceClient;
}

export function buildAuthMetadata(token: string, appName?: string): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Bearer ${token}`);
  if (appName && appName.trim().length > 0) {
    metadata.set("x-app-name", appName.trim());
  }
  return metadata;
}
