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
import { SIDECHAIN_STATE_LOCK_SCRIPT, SIDECHAIN_STATE_TYPE_SCRIPT } from "../../../utils/environment";
import { CellDepType } from "./interfaces/cell_dep_type";

/*
sidechain status

capacity: - 8 bytes
data: -
    pub chain_id:               u8,
    pub version:                u8,
    pub latest_block_height:    u128,
    pub latest_block_hash:      [u8; 32],
    pub committed_block_height: u128,
    pub committed_block_hash:   [u8; 32],
    pub status:                 u8,
type: - 65 bytes
    codehash: type id
    hashtype: type
    args: chain id
lock: - A.S. 33 bytes

 */
export class SidechainState implements CellInputType, CellOutputType, CellDepType {
  // 0 for waiting publish task
  // 1 for waiting submit task/challenge, the task is published
  static STATUS_WAITING_FOR_PUBLISH = BigInt(0);
  static STATUS_WAITING_FOR_SUBMIT = BigInt(1);

  capacity: bigint;

  chainId: bigint;
  version: bigint;
  latestBlockHeight: bigint;
  latestBlockHash: string;
  committedBlockHeight: bigint;
  committedBlockHash: string;
  status: bigint;

  outPoint: OutPoint;

  constructor(
    capacity: bigint,
    chainId: bigint,
    version: bigint,
    latestBlockHeight: bigint,
    latestBlockHash: string,
    committedBlockHeight: bigint,
    committedBlockHash: string,
    status: bigint,
    outPoint: OutPoint,
  ) {
    this.capacity = capacity;
    this.chainId = chainId;
    this.version = version;
    this.latestBlockHeight = latestBlockHeight;
    this.latestBlockHash = latestBlockHash;
    this.committedBlockHeight = committedBlockHeight;
    this.committedBlockHash = committedBlockHash;
    this.status = status;
    this.outPoint = outPoint;
  }

  static validate(cell: Cell): boolean {
    if (!cell.out_point) {
      return false;
    }

    return true;
  }

  static fromCell(cell: Cell): SidechainState | null {
    if (!SidechainState.validate(cell)) {
      return null;
    }
    const capacity = BigInt(cell.cell_output.capacity);

    const data = cell.data.substring(2);

    const chainId = leHexToBigIntUint8(data.substring(0, 2));
    const version = leHexToBigIntUint8(data.substring(2, 4));
    const latestBlockHeight = leHexToBigIntUint128(data.substring(4, 36));
    const latestBlockHash = data.substring(36, 100);
    const committedBlockHeight = leHexToBigIntUint128(data.substring(100, 132));
    const committedBlockHash = data.substring(132, 196);

    let status: bigint = this.STATUS_WAITING_FOR_SUBMIT;
    if (latestBlockHeight === committedBlockHeight) {
      status = this.STATUS_WAITING_FOR_PUBLISH;
    }
    const outPoint = cell.out_point!;

    return new SidechainState(
      capacity,
      chainId,
      version,
      latestBlockHeight,
      latestBlockHash,
      committedBlockHeight,
      committedBlockHash,
      status,
      outPoint,
    );
  }

  static default(): SidechainState {
    return new SidechainState(0n, 0n, 0n, 0n, ``, 0n, ``, 0n, defaultOutPoint());
  }

  toCellDep(): CKBComponents.CellDep {
    return {
      outPoint: {
        txHash: this.outPoint.tx_hash,
        index: this.outPoint.index,
      },
      depType: "code",
    };
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
      type: SIDECHAIN_STATE_TYPE_SCRIPT,
      lock: SIDECHAIN_STATE_LOCK_SCRIPT,
    };
  }

  toCellOutputData(): string {
    return `0x${remove0xPrefix(Uint8BigIntToLeHex(this.chainId))}${remove0xPrefix(
      Uint8BigIntToLeHex(this.version),
    )}${remove0xPrefix(Uint128BigIntToLeHex(this.latestBlockHeight))}${remove0xPrefix(
      this.latestBlockHash,
    )}${remove0xPrefix(Uint128BigIntToLeHex(this.committedBlockHeight))}${remove0xPrefix(this.committedBlockHash)}`;
  }

  getOutPoint(): string {
    return `${this.outPoint.tx_hash}-${this.outPoint.index}`;
  }

  static fromJSON(source: unknown): SidechainState {
    return Object.assign(SidechainState.default(), source);
  }
}
