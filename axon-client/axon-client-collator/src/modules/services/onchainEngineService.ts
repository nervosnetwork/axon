import { inject, injectable } from "inversify";
import { SidechainState } from "axon-client-common/src/modules/models/cells/sidechain_state";
import CrossChainService from "./crossChainService";
import { modules } from "../../container";
import { Task } from "axon-client-common/src/modules/models/cells/task";
import { CollatorPublishTaskTransformation } from "axon-client-common/src/modules/models/transformation/collator_publish_task";
import { CollatorPublishTaskWitness } from "axon-client-common/src/modules/models/witnesses/collator_publish_task_witness";
import TransactionService from "./transactionService";
import RpcService from "./rpcService";
import { CollatorSubmitTaskWitness } from "axon-client-common/src/modules/models/witnesses/collator_submit_task_witness";
import { CheckerInfo } from "axon-client-common/src/modules/models/cells/checker_info";
import { CollatorSubmitTaskTransformation } from "axon-client-common/src/modules/models/transformation/collator_submit_task";
import { CollatorSubmitChallengeTransformation } from "axon-client-common/src/modules/models/transformation/collator_submit_challenge";
import { CollatorSubmitChallengeWitness } from "axon-client-common/src/modules/models/witnesses/collator_submit_challenge_witness";
import { CollatorRefreshTaskTransformation } from "axon-client-common/src/modules/models/transformation/collator_refresh_task";
import { CollatorRefreshTaskWitness } from "axon-client-common/src/modules/models/witnesses/collator_refresh_task_witness";
import { logger } from "axon-client-common/src/utils/logger";
import EngineService from "./engineService";
import { defaultOutPoint, Uint128BigIntToLeHex } from "axon-client-common/src/utils/tools";

@injectable()
export default class OnchainEngineService implements EngineService {
  readonly #crossChainService: CrossChainService;
  readonly #transactionService: TransactionService;
  readonly #rpcService: RpcService;

  // @ts-expect-error Unused
  // istanbul ignore next
  #info = (outpoint: string, msg: string) => {
    logger.info(`EngineService: ${msg}`);
  };
  // @ts-expect-error Unused
  // istanbul ignore next
  #error = (outpoint: string, msg: string) => {
    logger.error(`EngineService: ${msg}`);
  };

  constructor(
    @inject(modules.CrossChainService) crossChainService: CrossChainService,
    @inject(modules.TransactionService) transactionService: TransactionService,
    @inject(modules.RpcService) rpcService: RpcService,
  ) {
    this.#crossChainService = crossChainService;
    this.#transactionService = transactionService;
    this.#rpcService = rpcService;
  }

  collatorPublishTask = async (xfer: CollatorPublishTaskTransformation) => {
    //assume all cell is genuine

    //get info from crossChainService
    const [latestBlockHeight, latestBlockHash, checkSize] = await this.#crossChainService.getCrossChainInfo();

    //do state transfer work
    xfer.inputState.latestBlockHeight = latestBlockHeight;
    xfer.inputState.latestBlockHash = latestBlockHash;
    xfer.inputState.status = SidechainState.STATUS_WAITING_FOR_SUBMIT;

    if (
      xfer.depConfig.checkerTotalCount < xfer.depConfig.checkerThreshold ||
      xfer.depBond.unlockSidechainHeight < xfer.inputState.latestBlockHeight
    ) {
      xfer.skip = true;
      return;
    }

    const bond = 10n;

    const tasks: Array<Task> = [];

    //should create several task cells
    //now we pick up some checkers,
    //the online version should adopt pseudo-random

    for (let i = 0; i < xfer.depConfig.commitThreshold; i++) {
      const capacity = 1000n;
      const task = new Task(
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
      tasks.push(task);
    }

    xfer.outputTask.push(...tasks);

    xfer.patternTypeWitness = new CollatorPublishTaskWitness(xfer.depConfig.chainId, bond);

    xfer.processed = true;
    //compose tx

    await this.#transactionService.composeTransaction(xfer);

    await this.#rpcService.sendTransaction(xfer.composedTx!);
  };

  collatorSubmitTask = async (xfer: CollatorSubmitTaskTransformation) => {
    //assume all cell is genuine

    //do state transfer work
    xfer.inputState.committedBlockHeight = xfer.inputState.latestBlockHeight;
    xfer.inputState.committedBlockHash = xfer.inputState.latestBlockHash;
    xfer.inputState.status = SidechainState.STATUS_WAITING_FOR_PUBLISH;

    const checkSize = xfer.inputCheckInfos[0].unpaidCheckDataSize;
    const feePerChecker = xfer.depConfig.checkFeeRate * checkSize;
    const fee = xfer.depConfig.commitThreshold * feePerChecker;

    xfer.inputFee.museAmount += fee;

    if (xfer.depConfig.commitThreshold !== BigInt(xfer.inputCheckInfos.length)) {
      xfer.skip = true;
      return;
    }

    for (const checkerInfo of xfer.inputCheckInfos) {
      checkerInfo.mode = CheckerInfo.CHECKER_IDLE;
    }

    xfer.patternTypeWitness = new CollatorSubmitTaskWitness(xfer.depConfig.chainId, fee, feePerChecker);

    xfer.processed = true;
    //compose tx

    await this.#transactionService.composeTransaction(xfer);

    await this.#rpcService.sendTransaction(xfer.composedTx!);
  };

  collatorSubmitChallenge = async (xfer: CollatorSubmitChallengeTransformation) => {
    //assume all cell is genuine

    //do state transfer work
    xfer.inputState.committedBlockHeight = xfer.inputState.latestBlockHeight;
    xfer.inputState.committedBlockHash = xfer.inputState.latestBlockHash;
    xfer.inputState.status = SidechainState.STATUS_WAITING_FOR_PUBLISH;

    const unpaidCheckDataSize = xfer.inputCheckInfos[0].unpaidCheckDataSize;
    const validCheckerInfo: CheckerInfo[] = [];
    const unValidCheckerInfo: CheckerInfo[] = [];
    let taskCount = 0n;
    let validChallengeCount = 0n;
    let invalidChallengeCount = 0n;

    let punishCheckerBitmap = 0n;
    for (const checkerInfo of xfer.inputCheckInfos) {
      if (checkerInfo.mode === CheckerInfo.TASK_PASSED) {
        taskCount += 1n;
        checkerInfo.mode = CheckerInfo.CHECKER_IDLE;
        validCheckerInfo.push(checkerInfo);
      } else if (checkerInfo.mode === CheckerInfo.CHALLENGE_PASSED) {
        validChallengeCount += 1n;
        checkerInfo.mode = CheckerInfo.CHECKER_IDLE;
        validCheckerInfo.push(checkerInfo);
      } else {
        punishCheckerBitmap += checkerInfo.checkId;
        invalidChallengeCount += 1n;
        unValidCheckerInfo.push(checkerInfo);
      }
    }

    const challenge_count = (xfer.inputConfig.commitThreshold - taskCount) * xfer.inputConfig.challengeThreshold;
    if (
      challenge_count !== validChallengeCount + invalidChallengeCount ||
      taskCount + validChallengeCount <= invalidChallengeCount
    ) {
      xfer.skip = true;
      return;
    }

    xfer.inputCheckInfos = validCheckerInfo.concat(unValidCheckerInfo);
    const feePerChecker = unpaidCheckDataSize * xfer.inputConfig.checkFeeRate;
    const fee = (taskCount + validChallengeCount) * feePerChecker;
    xfer.inputFee.museAmount += fee;

    xfer.patternTypeWitness = new CollatorSubmitChallengeWitness(
      xfer.inputConfig.chainId,
      fee,
      feePerChecker,
      Uint128BigIntToLeHex(punishCheckerBitmap).slice(2),
      taskCount,
      validChallengeCount,
    );

    xfer.processed = true;
    //compose tx

    await this.#transactionService.composeTransaction(xfer);
    await this.#rpcService.sendTransaction(xfer.composedTx!);
  };

  refreshTask = async (xfer: CollatorRefreshTaskTransformation) => {
    //assume all cell is genuine

    //do state transfer work
    if (xfer.depConfig.checkerTotalCount < xfer.depConfig.checkerThreshold) {
      xfer.skip = true;
      return;
    }

    for (const task of xfer.inputTasks) {
      //full fill the code
      if (task.refreshInterval > 0) {
        throw new Error(`~~`);
      }
    }

    for (const task of xfer.inputTasks) {
      //full fill the code
      task;
    }

    xfer.patternTypeWitness = new CollatorRefreshTaskWitness(xfer.depConfig.chainId);

    xfer.processed = true;
    //compose tx

    await this.#transactionService.composeTransaction(xfer);

    await this.#rpcService.sendTransaction(xfer.composedTx!);
  };
}
