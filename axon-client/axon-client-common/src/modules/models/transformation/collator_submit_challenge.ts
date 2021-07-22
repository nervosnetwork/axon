import { Transformation } from "./interfaces/transformation";
import { GlobalConfig } from "../cells/global_config";
import { SidechainConfig } from "../cells/sidechain_config";
import { Code } from "../cells/code";
import { SidechainState } from "../cells/sidechain_state";
import { SidechainFee } from "../cells/sidechain_fee";
import { CheckerInfo } from "../cells/checker_info";
import { CollatorSubmitChallengeWitness } from "../witnesses/collator_submit_challenge_witness";

/*
CollatorSubmitChallenge,

Dep:    0 Global Config Cell

Code Cell                   ->          Code Cell
Sidechain Config Cell       ->          Sidechain Config Cell
Sidechain State Cell        ->          Sidechain State Cell
Sidechain Fee Cell          ->          Sidechain Fee Cell
[Checker Info Cell]         ->          [Checker Info Cell]

*/

export class CollatorSubmitChallengeTransformation implements Transformation {
  depGlobalConfig: GlobalConfig;

  //use outpoint to refer as input
  //update cell and use it as output
  inputCode: Code;
  inputConfig: SidechainConfig;
  inputState: SidechainState;
  inputFee: SidechainFee;
  inputCheckInfos: Array<CheckerInfo>;

  patternTypeWitness: CollatorSubmitChallengeWitness | null;

  processed = false;
  skip = false;
  composedTx?: CKBComponents.RawTransaction = undefined;
  composedTxHash?: string = undefined;

  constructor(
    depGlobalConfig: GlobalConfig,
    inputCode: Code,
    inputConfig: SidechainConfig,
    inputState: SidechainState,
    inputFee: SidechainFee,
    inputCheckInfos: Array<CheckerInfo>,
  ) {
    this.depGlobalConfig = depGlobalConfig;
    this.inputCode = inputCode;
    this.inputConfig = inputConfig;
    this.inputState = inputState;
    this.inputFee = inputFee;
    this.inputCheckInfos = inputCheckInfos;
    this.patternTypeWitness = null;
  }

  toCellDeps(): Array<CKBComponents.CellDep> {
    return [this.depGlobalConfig.toCellDep()];
  }

  toCellInput(): Array<CKBComponents.CellInput> {
    return [
      this.inputCode.toCellInput(),
      this.inputConfig.toCellInput(),
      this.inputState.toCellInput(),
      this.inputFee.toCellInput(),
      ...this.inputCheckInfos.map((ci) => ci.toCellInput()),
    ];
  }

  toCellOutput(): Array<CKBComponents.CellOutput> {
    const checkerInfoOutputs: CheckerInfo[] = this.inputCheckInfos.filter(
      (checkerInfo) => checkerInfo.mode === CheckerInfo.CHECKER_IDLE,
    );
    return [
      this.inputCode.toCellOutput(),
      this.inputConfig.toCellOutput(),
      this.inputState.toCellOutput(),
      this.inputFee.toCellOutput(),
      ...checkerInfoOutputs.map((ci) => ci.toCellOutput()),
    ];
  }

  toCellOutputData(): Array<string> {
    const checkerInfoOutputs: CheckerInfo[] = this.inputCheckInfos.filter(
      (checkerInfo) => checkerInfo.mode === CheckerInfo.CHECKER_IDLE,
    );
    return [
      this.inputCode.toCellOutputData(),
      this.inputConfig.toCellOutputData(),
      this.inputState.toCellOutputData(),
      this.inputFee.toCellOutputData(),
      ...checkerInfoOutputs.map((ci) => ci.toCellOutputData()),
    ];
  }

  toWitness(): Array<CKBComponents.WitnessArgs> {
    return [this.patternTypeWitness!.toWitness()];
  }
}
