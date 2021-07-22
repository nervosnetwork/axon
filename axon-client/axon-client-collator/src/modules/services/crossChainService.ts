export default interface CrossChainService {
  getCrossChainInfo(): Promise<[bigint, string, bigint]>;
}
