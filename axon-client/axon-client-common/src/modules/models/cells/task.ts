import { Cell, OutPoint } from "@ckb-lumos/base";
import {
  defaultOutPoint,
  leHexToBigIntUint128,
  leHexToBigIntUint16,
  leHexToBigIntUint8,
  remove0xPrefix,
  Uint128BigIntToLeHex,
  Uint16BigIntToLeHex,
  Uint64BigIntToLeHex,
  Uint8BigIntToLeHex,
} from "../../../utils/tools";
import { CellOutputType } from "./interfaces/cell_output_type";
import { CellInputType } from "./interfaces/cell_input_type";
import { TASK_STATE_LOCK_SCRIPT, TASK_TYPE_SCRIPT } from "../../../utils/environment";

/*
task

capacity: - 8 bytes
data: -
    pub chain_id:                u8,
    pub version:                 u8,
    pub check_block_height_from: u128,
    pub check_block_height_to:   u128,
    pub check_block_hash_to:     [u8;32],
    pub check_data_size:         u128,
    pub refresh_interval:        u16,
    pub mode:                    TaskCellMode,
type: - 65 bytes
    codehash: typeid
    hashtype: type
    args: chain id | public key hash - 21 bytes
lock: - A.S. 33 bytes

 */
export class Task implements CellInputType, CellOutputType {
  static TASK = BigInt(0);
  static CHALLENGE = BigInt(1);

  capacity: bigint;

  chainId: bigint;
  version: bigint;
  checkBlockHeightFrom: bigint;
  checkBlockHeightTo: bigint;
  checkBlockHashTo: string;
  checkDataSize: bigint;
  refreshInterval: bigint;
  mode: bigint;

  outPoint: OutPoint;

  constructor(
    capacity: bigint,
    chainId: bigint,
    version: bigint,
    checkBlockHeightFrom: bigint,
    checkBlockHeightTo: bigint,
    checkBlockHashTo: string,
    checkDataSize: bigint,
    refreshInterval: bigint,
    mode: bigint,
    outPoint: OutPoint,
  ) {
    this.capacity = capacity;
    this.chainId = chainId;
    this.version = version;
    this.checkBlockHeightFrom = checkBlockHeightFrom;
    this.checkBlockHeightTo = checkBlockHeightTo;
    this.checkBlockHashTo = checkBlockHashTo;
    this.checkDataSize = checkDataSize;
    this.refreshInterval = refreshInterval;
    this.mode = mode;
    this.outPoint = outPoint;
  }

  static validate(cell: Cell): boolean {
    if (!cell.out_point) {
      return false;
    }

    return true;
  }

  static fromCell(cell: Cell): Task | null {
    if (!Task.validate(cell)) {
      return null;
    }
    const capacity = BigInt(cell.cell_output.capacity);

    const type_args = cell.cell_output.type!.args.substring(2);
    const data = cell.data.substring(2);

    const chainId = leHexToBigIntUint8(type_args.substring(0, 2));
    const version = leHexToBigIntUint8(data.substring(0, 2));
    const checkBlockHeightFrom = leHexToBigIntUint128(data.substring(2, 34));
    const checkBlockHeightTo = leHexToBigIntUint128(data.substring(34, 66));
    const checkBlockHashTo = data.substring(66, 130);
    const checkDataSize = leHexToBigIntUint128(data.substring(139, 162));
    const refreshInterval = leHexToBigIntUint16(data.substring(162, 194));
    const mode = leHexToBigIntUint8(data.substring(194, 196));
    const outPoint = cell.out_point!;

    return new Task(
      capacity,
      chainId,
      version,
      checkBlockHeightFrom,
      checkBlockHeightTo,
      checkBlockHashTo,
      checkDataSize,
      refreshInterval,
      mode,
      outPoint,
    );
  }

  static default(): Task {
    return new Task(0n, 0n, 0n, 0n, 0n, ``, 0n, 0n, 0n, defaultOutPoint());
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
    return {
      capacity: Uint64BigIntToLeHex(this.capacity),
      type: TASK_TYPE_SCRIPT,
      lock: TASK_STATE_LOCK_SCRIPT,
    };
  }

  toCellOutputData(): string {
    return `0x${remove0xPrefix(Uint8BigIntToLeHex(this.chainId))}${remove0xPrefix(
      Uint8BigIntToLeHex(this.version),
    )}${remove0xPrefix(Uint128BigIntToLeHex(this.checkBlockHeightFrom))}${remove0xPrefix(
      Uint128BigIntToLeHex(this.checkBlockHeightTo),
    )}${remove0xPrefix(this.checkBlockHashTo)}${remove0xPrefix(
      Uint128BigIntToLeHex(this.checkDataSize),
    )}${remove0xPrefix(Uint16BigIntToLeHex(this.refreshInterval))}${remove0xPrefix(Uint8BigIntToLeHex(this.mode))}`;
  }

  getOutPoint(): string {
    return `${this.outPoint.tx_hash}-${this.outPoint.index}`;
  }

  static fromJSON(source: unknown): Task {
    return Object.assign(Task.default(), source);
  }
}
