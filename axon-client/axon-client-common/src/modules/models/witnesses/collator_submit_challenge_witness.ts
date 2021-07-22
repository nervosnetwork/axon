import { WitnessInputType } from "./interfaces/witness_input_type";
import { remove0xPrefix, Uint128BigIntToLeHex, Uint8BigIntToLeHex } from "../../../utils/tools";

/*
    pub pattern:               u8,
    pub chain_id:              u8,
    pub fee:                   u128,
    pub fee_per_checker:       u128,
    pub punish_checker_bitmap: [u8; 32],
    pub task_count:            u8,
    pub valid_challenge_count: u8,
*/
export class CollatorSubmitChallengeWitness implements WitnessInputType {
  static COLLATOR_SUBMIT_CHALLENGE_WITNESS = 13n;

  pattern: bigint;
  chainId: bigint;
  fee: bigint;
  feePerChecker: bigint;
  punishCheckerBitmap: string;
  taskCount: bigint;
  validChallengeCount: bigint;

  constructor(
    chainId: bigint,
    fee: bigint,
    feePerChecker: bigint,
    punishCheckerBitmap: string,
    taskCount: bigint,
    validChallengeCount: bigint,
  ) {
    this.pattern = CollatorSubmitChallengeWitness.COLLATOR_SUBMIT_CHALLENGE_WITNESS;
    this.chainId = chainId;
    this.fee = fee;
    this.feePerChecker = feePerChecker;
    this.punishCheckerBitmap = punishCheckerBitmap;
    this.taskCount = taskCount;
    this.validChallengeCount = validChallengeCount;
  }

  static default(): CollatorSubmitChallengeWitness {
    return new CollatorSubmitChallengeWitness(0n, 0n, 0n, ``, 0n, 0n);
  }

  toWitness(): CKBComponents.WitnessArgs {
    const data = `0x${remove0xPrefix(Uint8BigIntToLeHex(this.pattern))}${remove0xPrefix(
      Uint8BigIntToLeHex(this.chainId),
    )}${remove0xPrefix(Uint128BigIntToLeHex(this.fee))}${remove0xPrefix(
      Uint128BigIntToLeHex(this.feePerChecker),
    )}${remove0xPrefix(this.punishCheckerBitmap)}${remove0xPrefix(Uint8BigIntToLeHex(this.taskCount))}${remove0xPrefix(
      Uint8BigIntToLeHex(this.validChallengeCount),
    )}`;

    return { lock: "", inputType: data, outputType: "" };
  }
}
