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
import { SIDECHAIN_BOND_LOCK_SCRIPT, SIDECHAIN_BOND_TYPE_SCRIPT } from "../../../utils/environment";

/*
sidechain bond

capacity: - 8 bytes
data: - amount
type: - 65 bytes
    codehash: sudt type
    hashtype: type
    args: custom sudt admin
lock: - 65 bytes
    codehash: type id
    hashtype: type
    args: chain_id | collator_public_key_hash | unlock_sidechain_height - 37 bytes

 */
export class SidechainBond implements CellInputType, CellOutputType {
  capacity: bigint;
  sudtAmount: bigint;

  chainId: bigint;
  collatorPublicKeyHash: string;
  unlockSidechainHeight: bigint;

  outPoint: OutPoint;

  constructor(
    capacity: bigint,
    sudtAmount: bigint,
    chainId: bigint,
    collatorPublicKeyHash: string,
    unlockSidechainHeight: bigint,
    outPoint: OutPoint,
  ) {
    this.capacity = capacity;
    this.sudtAmount = sudtAmount;
    this.chainId = chainId;
    this.collatorPublicKeyHash = collatorPublicKeyHash;
    this.unlockSidechainHeight = unlockSidechainHeight;
    this.outPoint = outPoint;
  }

  static validate(cell: Cell): boolean {
    if (!cell.out_point) {
      return false;
    }

    return true;
  }

  static fromCell(cell: Cell): SidechainBond | null {
    if (!SidechainBond.validate(cell)) {
      return null;
    }
    const capacity = BigInt(cell.cell_output.capacity);
    const sudtAmount = leHexToBigIntUint128(cell.data);

    const lockArgs = cell.cell_output.lock.args.substring(2);

    const chainId = leHexToBigIntUint8(lockArgs.substring(0, 2));
    const collatorPublicKeyHash = lockArgs.substring(2, 42);
    const unlockSidechainHeight = leHexToBigIntUint128(lockArgs.substring(42, 74));

    const outPoint = cell.out_point!;

    return new SidechainBond(capacity, sudtAmount, chainId, collatorPublicKeyHash, unlockSidechainHeight, outPoint);
  }

  static default(): SidechainBond {
    return new SidechainBond(0n, 0n, 0n, ``, 0n, defaultOutPoint());
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
    const lock = SIDECHAIN_BOND_LOCK_SCRIPT;
    lock.args = `0x${remove0xPrefix(Uint8BigIntToLeHex(this.chainId))}${remove0xPrefix(
      this.collatorPublicKeyHash,
    )}${remove0xPrefix(Uint128BigIntToLeHex(this.unlockSidechainHeight))}`;
    return {
      capacity: Uint64BigIntToLeHex(this.capacity),
      type: SIDECHAIN_BOND_TYPE_SCRIPT,
      lock,
    };
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

  toCellOutputData(): string {
    return `${Uint128BigIntToLeHex(this.sudtAmount)}`;
  }

  getOutPoint(): string {
    return `${this.outPoint.tx_hash}-${this.outPoint.index}`;
  }

  static fromJSON(source: unknown): SidechainBond {
    return Object.assign(SidechainBond.default(), source);
  }
}
