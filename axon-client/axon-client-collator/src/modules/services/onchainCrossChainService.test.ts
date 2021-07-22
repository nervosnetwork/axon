import "reflect-metadata";
import OnchainCrossChainService from "./onchainCrossChainService";

describe("OnchainCrossChainService", () => {
  test("getCrossChainInfo", async () => {
    const crossChainService = new OnchainCrossChainService();
    const [latestBlockHeight, latestBlockHash, checkSize] = await crossChainService.getCrossChainInfo();
    expect(latestBlockHash).toBe(``);
    expect(latestBlockHeight).toBe(0n);
    expect(checkSize).toBe(0n);
  });
});
