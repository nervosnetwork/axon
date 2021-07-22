export const modules: Record<string, symbol> = {
  CrossChainService: Symbol("CrossChainService"),
  EngineService: Symbol("EngineService"),
  RpcService: Symbol("RpcService"),
  ScanService: Symbol("ScanService"),
  TaskService: Symbol("TaskService"),
  TransactionService: Symbol("TransactionService"),
};

import { Container } from "inversify";

import OnchainCrossChainService from "./modules/services/onchainCrossChainService";
import OnchainEngineService from "./modules/services/onchainEngineService";
import OnchainRpcService from "./modules/services/onchainRpcService";
import OnchainScanService from "./modules/services/onchainScanService";
import OnchainTaskService from "./modules/services/onchainTaskService";
import OnchainTransactionService from "./modules/services/onchainTransactionService";

export const container = new Container({ defaultScope: "Singleton" });

export function bootstrap(): void {
  container.bind(modules.CrossChainService).to(OnchainCrossChainService);
  container.bind(modules.EngineService).to(OnchainEngineService);
  container.bind(modules.RpcService).to(OnchainRpcService);
  container.bind(modules.ScanService).to(OnchainScanService);
  container.bind(modules.TaskService).to(OnchainTaskService);
  container.bind(modules.TransactionService).to(OnchainTransactionService);
}
