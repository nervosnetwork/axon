import { Cell, OutPoint } from "@ckb-lumos/base";
import {
  defaultOutPoint,
  leHexToBigIntUint128,
  leHexToBigIntUint8,
  remove0xPrefix,
  Uint128BigIntToLeHex,
  Uint64BigIntToLeHex,
  Uint8BigIntToLeHex,
} from "../../../utils/tools";
import { CellOutputType } from "./interfaces/cell_output_type";
import { CellInputType } from "./interfaces/cell_input_type";
import { CHECKER_INFO_LOCK_SCRIPT, CHECKER_INFO_TYPE_SCRIPT } from "../../../utils/environment";

/*
checker info

capacity: - 8 bytes
data: - 1+1+16+512+20+1=551
    pub chain_id:                u8,
    pub checker_id:              u8,
    pub unpaid_fee:              u128,
    pub rpc_url:                 [u8; 512],
    pub checker_public_key_hash: [u8; 20],
    pub mode:                    CheckerInfoCellMode,//u8
type: - 54 bytes
    codehash: typeid
    hashtype: type
    args: chain id | public key hash - 21 bytes
lock: - A.S. 33 bytes

 */
export class CheckerInfo implements CellInputType, CellOutputType {
  static CHECKER_IDLE = 0n;
  static TASK_PASSED = 1n;
  static CHALLENGE_PASSED = 2n;
  static CHALLENGE_REJECTED = 3n;

  capacity: bigint;

  chainId: bigint;
  checkerPublicKeyHash: string;

  checkId: bigint;
  unpaidFee: bigint;
  rpcUrl: string;
  mode: bigint;
  unpaidCheckDataSize: bigint;
  outPoint: OutPoint;

  //type args for lumos
  //checkId:bigint
  //checkerPublicKeyHash:string

  constructor(
    capacity: bigint,
    chainId: bigint,
    checkerPublicKeyHash: string,
    checkId: bigint,
    unpaidFee: bigint,
    rpcUrl: string,
    mode: bigint,
    unpaidCheckDataSize: bigint,
    outPoint: OutPoint,
  ) {
    this.capacity = capacity;

    this.chainId = chainId;
    this.checkerPublicKeyHash = checkerPublicKeyHash;

    this.checkId = checkId;
    this.unpaidFee = unpaidFee;
    this.rpcUrl = rpcUrl;
    this.mode = mode;
    this.unpaidCheckDataSize = unpaidCheckDataSize;
    this.outPoint = outPoint;
  }

  static validate(cell: Cell): boolean {
    if (!cell.out_point) {
      return false;
    }

    return true;
  }

  static fromCell(cell: Cell): CheckerInfo | null {
    if (!CheckerInfo.validate(cell)) {
      return null;
    }
    const capacity = BigInt(cell.cell_output.capacity);

    const data = cell.data.substring(2);
    const lock_args = cell.cell_output.lock.args.substring(2);

    const chainId = leHexToBigIntUint8(lock_args.substring(0, 2));
    const checkerPublicKeyHash = cell.cell_output.lock.args.substring(2, 42);

    const checkId = leHexToBigIntUint8(data.substring(0, 2));
    const unpaidFee = leHexToBigIntUint128(data.substring(2, 34));
    const rpcUrl = data.substring(34, 1058);
    const mode = leHexToBigIntUint8(data.substring(1058, 1060));
    const unpaidCheckDataSize = leHexToBigIntUint128(data.substring(1060, 1092));
    const outPoint = cell.out_point!;

    return new CheckerInfo(
      capacity,
      chainId,
      checkerPublicKeyHash,
      unpaidFee,
      checkId,
      rpcUrl,
      mode,
      unpaidCheckDataSize,
      outPoint,
    );
  }

  static default(): CheckerInfo {
    return new CheckerInfo(0n, 0n, ``, 0n, 0n, ``, 0n, 0n, defaultOutPoint());
  }

  toCellInput(): CKBComponents.CellInput {
    return {
      previousOutput: {
        txHash: this.outPoint.tx_hash,
        index: this.outPoint.index,
      },
      since: "0x0",
    };
  }

  toCellOutput(): CKBComponents.CellOutput {
    const type = CHECKER_INFO_TYPE_SCRIPT;
    type.args = `0x${remove0xPrefix(Uint8BigIntToLeHex(this.chainId))}${remove0xPrefix(this.checkerPublicKeyHash)}`;

    return {
      capacity: Uint64BigIntToLeHex(this.capacity),
      type,
      lock: CHECKER_INFO_LOCK_SCRIPT,
    };
  }

  toCellOutputData(): string {
    return `$0x{remove0xPrefix(Uint8BigIntToLeHex(this.checkId))}${remove0xPrefix(
      Uint128BigIntToLeHex(this.unpaidFee),
    )}${remove0xPrefix(this.rpcUrl)}${remove0xPrefix(Uint8BigIntToLeHex(this.mode))}${remove0xPrefix(
      Uint128BigIntToLeHex(this.unpaidCheckDataSize),
    )}`;
  }

  getOutPoint(): string {
    return `${this.outPoint.tx_hash}-${this.outPoint.index}`;
  }

  static fromJSON(source: unknown): CheckerInfo {
    return Object.assign(CheckerInfo.default(), source);
  }
}
