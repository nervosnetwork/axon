import "reflect-metadata";

import EngineService from "./engineService";
import RpcService from "./rpcService";
import TransactionService from "./transactionService";
import OnchainEngineService from "./onchainEngineService";

import { GlobalConfig } from "axon-client-common/src/modules/models/cells/global_config";
import { SidechainConfig } from "axon-client-common/src/modules/models/cells/sidechain_config";
import { Code } from "axon-client-common/src/modules/models/cells/code";
import { CheckerInfo } from "axon-client-common/src/modules/models/cells/checker_info";

import { createMock } from "ts-auto-mock";
import CrossChainService from "./crossChainService";
import { CollatorSubmitTaskTransformation } from "axon-client-common/src/modules/models/transformation/collator_submit_task";
import { SidechainState } from "axon-client-common/src/modules/models/cells/sidechain_state";
import { SidechainFee } from "axon-client-common/src/modules/models/cells/sidechain_fee";
import { CollatorSubmitTaskWitness } from "axon-client-common/src/modules/models/witnesses/collator_submit_task_witness";
import { CollatorPublishTaskTransformation } from "axon-client-common/src/modules/models/transformation/collator_publish_task";
import { Task } from "axon-client-common/src/modules/models/cells/task";
import { defaultOutPoint, leHexToBigIntUint128 } from "axon-client-common/src/utils/tools";
import { CollatorPublishTaskWitness } from "axon-client-common/src/modules/models/witnesses/collator_publish_task_witness";
import { SidechainBond } from "axon-client-common/src/modules/models/cells/sidechain_bond";
import { CollatorSubmitChallengeTransformation } from "axon-client-common/src/modules/models/transformation/collator_submit_challenge";
import { Transformation } from "axon-client-common/src/modules/models/transformation/interfaces/transformation";

class Context {
  rpcService: RpcService;
  transactionService: TransactionService;
  crossChainService: CrossChainService;
  engineService: EngineService;

  constructor(
    rpcService: RpcService,
    transactionService: TransactionService,
    crossChainService: CrossChainService,
    engineService: EngineService,
  ) {
    this.rpcService = rpcService;
    this.transactionService = transactionService;
    this.crossChainService = crossChainService;
    this.engineService = engineService;
  }
}

function prepareContext(): Context {
  const mockTransactionService = createMock<TransactionService>();
  const mockRpcService = createMock<RpcService>();
  const mockCrossChainService = createMock<CrossChainService>();

  return new Context(
    mockRpcService,
    mockTransactionService,
    mockCrossChainService,
    new OnchainEngineService(mockCrossChainService, mockTransactionService, mockRpcService),
  );
}

function haveBeenComposedAndSended(xfer: Transformation, context: Context) {
  const composeTransaction = context.transactionService.composeTransaction as jest.Mock;
  const sendTransaction = context.rpcService.sendTransaction as jest.Mock;
  expect(composeTransaction).toHaveBeenCalledTimes(1);
  expect(composeTransaction).toHaveBeenCalledWith(xfer);
  expect(sendTransaction).toHaveBeenCalledTimes(1);
  expect(sendTransaction).toHaveBeenCalledWith(xfer.composedTx);
}

function isSubmitTaskSuccess(xfer: CollatorSubmitTaskTransformation, context: Context): void {
  expect(xfer.inputState.committedBlockHeight).toBe(xfer.inputState.latestBlockHeight);
  expect(xfer.inputState.status).toBe(SidechainState.STATUS_WAITING_FOR_PUBLISH);

  const checkSize = xfer.inputCheckInfos[0].unpaidCheckDataSize;
  const feePerChecker = xfer.depConfig.checkFeeRate * checkSize;
  const fee = xfer.depConfig.commitThreshold * feePerChecker;

  //input muse Amount equal 0
  expect(xfer.inputFee.museAmount).toBe(fee);

  expect(xfer.skip).toBe(false);
  for (const checkerInfo of xfer.inputCheckInfos) {
    expect(checkerInfo.mode).toBe(CheckerInfo.CHECKER_IDLE);
  }
  expect(xfer.depConfig.commitThreshold).toBe(BigInt(xfer.inputCheckInfos.length));

  expect(xfer.patternTypeWitness).toEqual(new CollatorSubmitTaskWitness(xfer.depConfig.chainId, fee, feePerChecker));
  expect(xfer.processed).toBeTruthy();

  haveBeenComposedAndSended(xfer, context);
}

async function isPublishTaskSuccess(xfer: CollatorPublishTaskTransformation, context: Context) {
  const [latestBlockHeight, latestBlockHash, checkSize] = await context.crossChainService.getCrossChainInfo();

  expect(xfer.inputState.latestBlockHeight).toBe(latestBlockHeight);
  expect(xfer.inputState.latestBlockHash).toBe(latestBlockHash);
  expect(xfer.inputState.status).toBe(SidechainState.STATUS_WAITING_FOR_SUBMIT);
  expect(xfer.depConfig.commitThreshold).toBeLessThan(xfer.depConfig.checkerTotalCount);
  expect(xfer.depConfig.checkerTotalCount).toBeGreaterThan(xfer.depConfig.checkerThreshold);
  expect(xfer.depBond.unlockSidechainHeight).toBeGreaterThan(xfer.inputState.latestBlockHeight);
  expect(xfer.skip).toBe(false);

  expect(BigInt(xfer.outputTask.length)).toBe(xfer.depConfig.commitThreshold);
  for (const task of xfer.outputTask) {
    const capacity = 1000n;
    const task_res = new Task(
      capacity,
      xfer.inputState.chainId,
      xfer.inputState.version,
      xfer.inputState.committedBlockHeight + 1n,
      xfer.inputState.latestBlockHeight,
      xfer.inputState.latestBlockHash,
      checkSize,
      xfer.depConfig.refreshInterval,
      0n,
      defaultOutPoint(),
    );
    expect(task).toEqual(task_res);
  }

  expect(xfer.patternTypeWitness).toEqual(new CollatorPublishTaskWitness(xfer.depConfig.chainId, 10n));
  expect(xfer.processed).toBeTruthy();
  haveBeenComposedAndSended(xfer, context);
}

function isSubmitChallengeSuccess(xfer: CollatorSubmitChallengeTransformation, context: Context) {
  expect(xfer.inputState.committedBlockHeight).toBe(xfer.inputState.latestBlockHeight);
  expect(xfer.inputState.committedBlockHash).toBe(xfer.inputState.latestBlockHash);
  expect(xfer.inputState.status).toBe(SidechainState.STATUS_WAITING_FOR_PUBLISH);

  const challenge_count =
    (xfer.inputConfig.commitThreshold - xfer.patternTypeWitness!.taskCount) * xfer.inputConfig.challengeThreshold;
  const invalidChallengeCount = BigInt(
    (leHexToBigIntUint128(xfer.patternTypeWitness!.punishCheckerBitmap).toString(2).match(`1`) || []).length,
  );
  expect(challenge_count).toBe(xfer.patternTypeWitness!.validChallengeCount + invalidChallengeCount);
  expect(xfer.patternTypeWitness!.taskCount + xfer.patternTypeWitness!.validChallengeCount).toBeGreaterThan(
    invalidChallengeCount,
  );
  expect(xfer.skip).toBeFalsy();

  const feePerChecker = xfer.inputCheckInfos[0].unpaidCheckDataSize * xfer.inputConfig.checkFeeRate;
  const fee = (xfer.patternTypeWitness!.taskCount + xfer.patternTypeWitness!.validChallengeCount) * feePerChecker;
  expect(xfer.inputFee.museAmount).toBe(fee);
  expect(xfer.processed).toBeTruthy();
  haveBeenComposedAndSended(xfer, context);
}

describe("OnchainEngineService", () => {
  test("collatorSubmitTask should failed if total checkerInfo count is less than commit threshold", async () => {
    const context = prepareContext();

    const config = SidechainConfig.default();
    config.commitThreshold = 3n;
    const sidechainState = SidechainState.default();
    sidechainState.latestBlockHeight = 1n;
    const xfer = new CollatorSubmitTaskTransformation(
      GlobalConfig.default(),
      config,
      Code.default(),
      sidechainState,
      SidechainFee.default(),
      [CheckerInfo.default()],
    );

    await context.engineService.collatorSubmitTask(xfer);

    expect(() => isSubmitTaskSuccess(xfer, context)).toThrow();
  });

  test("collatorSubmitTask should success", async () => {
    const context = prepareContext();

    const config = SidechainConfig.default();
    config.commitThreshold = 1n;
    const sidechainState = SidechainState.default();
    sidechainState.latestBlockHeight = 1n;
    const xfer = new CollatorSubmitTaskTransformation(
      GlobalConfig.default(),
      config,
      Code.default(),
      sidechainState,
      SidechainFee.default(),
      [CheckerInfo.default()],
    );

    await context.engineService.collatorSubmitTask(xfer);

    expect(() => isSubmitTaskSuccess(xfer, context)).not.toThrow();
  });

  test("collatorPublishTask should failed if total checker count is less than commit threshold", async () => {
    const context = prepareContext();

    const config = SidechainConfig.default();
    config.commitThreshold = 11n;
    config.checkerTotalCount = 10n;
    config.checkerThreshold = 8n;

    const bond = SidechainBond.default();
    bond.unlockSidechainHeight = 100n;

    const xfer = new CollatorPublishTaskTransformation(
      GlobalConfig.default(),
      config,
      bond,
      Code.default(),
      SidechainState.default(),
    );

    await context.engineService.collatorPublishTask(xfer);

    await expect(isPublishTaskSuccess(xfer, context)).rejects.toThrow();
  });

  test("collatorPublishTask should success", async () => {
    const context = prepareContext();

    const config = SidechainConfig.default();
    config.commitThreshold = 3n;
    config.checkerTotalCount = 10n;
    config.checkerThreshold = 8n;

    const bond = SidechainBond.default();
    bond.unlockSidechainHeight = 100n;

    const xfer = new CollatorPublishTaskTransformation(
      GlobalConfig.default(),
      config,
      bond,
      Code.default(),
      SidechainState.default(),
    );

    await context.engineService.collatorPublishTask(xfer);

    await expect(isPublishTaskSuccess(xfer, context)).resolves.not.toThrow();
  });

  test("collatorPublishChalleng should failed if total valid cell count is less than unvalid cell", async () => {
    const context = prepareContext();

    const config = SidechainConfig.default();
    config.commitThreshold = 4n;
    config.challengeThreshold = 1n;

    const checkerInfos = [];
    for (let i = 0; i < 3; i++) {
      const checkerInfo = CheckerInfo.default();
      checkerInfo.mode = CheckerInfo.CHALLENGE_REJECTED;
      checkerInfos.push(checkerInfo);
    }
    const validCheckerInfo = CheckerInfo.default();
    validCheckerInfo.mode = CheckerInfo.TASK_PASSED;
    checkerInfos.push(validCheckerInfo);

    const xfer = new CollatorSubmitChallengeTransformation(
      GlobalConfig.default(),
      Code.default(),
      config,
      SidechainState.default(),
      SidechainFee.default(),
      checkerInfos,
    );

    await context.engineService.collatorSubmitChallenge(xfer);

    expect(() => isSubmitChallengeSuccess(xfer, context)).toThrow();
  });

  test("collatorPublishChalleng should success", async () => {
    const context = prepareContext();

    const config = SidechainConfig.default();
    config.commitThreshold = 4n;
    config.challengeThreshold = 1n;

    const checkerInfos = [];
    for (let i = 0; i < 3; i++) {
      const checkerInfo = CheckerInfo.default();
      checkerInfo.mode = CheckerInfo.TASK_PASSED;
      checkerInfos.push(checkerInfo);
    }
    const unValidCheckerInfo = CheckerInfo.default();
    unValidCheckerInfo.mode = CheckerInfo.CHALLENGE_REJECTED;
    unValidCheckerInfo.checkId = 1n;
    checkerInfos.push(unValidCheckerInfo);

    const xfer = new CollatorSubmitChallengeTransformation(
      GlobalConfig.default(),
      Code.default(),
      config,
      SidechainState.default(),
      SidechainFee.default(),
      checkerInfos,
    );

    await context.engineService.collatorSubmitChallenge(xfer);

    expect(() => isSubmitChallengeSuccess(xfer, context)).not.toThrow();
  });
});
