import { blake2b, PERSONAL, scriptToHash } from "@nervosnetwork/ckb-sdk-utils";
import type { Cell, Script } from "@ckb-lumos/base";
import { OutPoint, utils } from "@ckb-lumos/base";
import Rpc from "@nervosnetwork/ckb-sdk-rpc";

export function scriptHash(script: Script): string {
  return scriptToHash({
    args: script.args,
    codeHash: script.code_hash,
    hashType: script.hash_type,
  });
}

export function scriptCamelToSnake(script: CKBComponents.Script): Script {
  return {
    args: script.args,
    code_hash: script.codeHash,
    hash_type: script.hashType,
  };
}

export function scriptSnakeToCamel(script: Script): CKBComponents.Script {
  return {
    args: script.args,
    codeHash: script.code_hash,
    hashType: script.hash_type,
  };
}

export const leHexToBigIntUint128 = (rawHexString: string): bigint => {
  return utils.readBigUInt128LE(prepare0xPrefix(rawHexString));
};

export const leHexToBigIntUint64 = (rawHexString: string): bigint => {
  return utils.readBigUInt64LE(prepare0xPrefix(rawHexString));
};

export const leHexToBigIntUint32 = (rawHexString: string): bigint => {
  const buf = Buffer.from(prepare0xPrefix(rawHexString).slice(2), "hex");
  return BigInt(buf.readUInt32LE());
};

export const leHexToBigIntUint16 = (rawHexString: string): bigint => {
  const buf = Buffer.from(prepare0xPrefix(rawHexString).slice(2), "hex");
  return BigInt(buf.readUInt16LE());
};

export const leHexToBigIntUint8 = (rawHexString: string): bigint => {
  const buf = Buffer.from(prepare0xPrefix(rawHexString).slice(2), "hex");
  return BigInt(buf.readUInt8());
};

export const Uint128BigIntToLeHex = (u128: bigint): string => {
  if (u128 < 0) {
    throw new Error(`Uint128BigIntToLeHex, input: ${u128}`);
  }
  return utils.toBigUInt128LE(u128);
};

export const Uint64BigIntToLeHex = (u64: bigint): string => {
  if (u64 < 0) {
    throw new Error(`Uint64BigIntToLeHex, input: ${u64}`);
  }
  return utils.toBigUInt64LE(u64);
};

export const Uint32BigIntToLeHex = (u32: bigint): string => {
  if (u32 < 0) {
    throw new Error(`Uint32BigIntToLeHex, input: ${u32}`);
  }
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(Number(u32));
  return `0x${buf.toString("hex")}`;
};

export const Uint16BigIntToLeHex = (u16: bigint): string => {
  if (u16 < 0) {
    throw new Error(`Uint16BigIntToLeHex, input: ${u16}`);
  }

  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(Number(u16));

  return `0x${buf.toString("hex")}`;
};

export const Uint8BigIntToLeHex = (u8: bigint): string => {
  if (u8 < 0) {
    throw new Error(`Uint8BigIntToLeHex, input: ${u8}`);
  }

  const buf = Buffer.alloc(1);
  buf.writeUInt8(Number(u8));

  return `0x${buf.toString("hex")}`;
};

/*
convert little-endian hex string to big-endian hex string
and
vice-verse
 */
export const changeHexEncodeEndian = (leHex: string): string => {
  return `0x${Buffer.from(remove0xPrefix(leHex), "hex").reverse().toString("hex")}`;
};

/*export const scriptSize = (script: CKBComponents.Script) : bigint =>{
  const str = serializeScript(script).substring(2);
  return BigInt(str.length/2)
}*/

export const getCellFromRawTransaction = (rawTx: CKBComponents.RawTransaction, txHash: string, index: number): Cell => {
  return {
    cell_output: {
      capacity: rawTx.outputs[index].capacity,
      lock: scriptCamelToSnake(rawTx.outputs[index].lock),
      type: rawTx.outputs[index].type ? scriptCamelToSnake(rawTx.outputs[index].type!) : undefined,
    },
    data: rawTx.outputsData[index],
    out_point: {
      tx_hash: txHash,
      index: numberToHex(index),
    },
  };
};

export function remove0xPrefix(input: string): string {
  return input.startsWith("0x") ? input.substring(2) : input;
}

export function prepare0xPrefix(input: string): string {
  return input.startsWith("0x") ? input : "0x" + input;
}

export function bigIntToHex(bn: bigint) {
  let hex = bn.toString(16);
  if (hex.length % 2) {
    hex = "0" + hex;
  }
  return "0x" + hex;
}

export function numberToHex(numero: number) {
  let hex = numero.toString(16);
  if (hex.length % 2) {
    hex = "0" + hex;
  }
  return "0x" + hex;
}

export function ckbBlake2b(hexStrings: Array<string>): string {
  const blake2bIns = blake2b(32, null, null, PERSONAL, undefined);
  hexStrings.forEach((hexString) => blake2bIns.update(Buffer.from(remove0xPrefix(hexString), "hex")));
  return prepare0xPrefix(blake2bIns.final("hex") as string);
}

export function defaultOutPoint(): OutPoint {
  return {
    tx_hash: "0xdead111111111111111111111111111111111111111111111111111111111111",
    index: "0x0",
  };
}

export function defaultScript(): CKBComponents.Script {
  return {
    args: "0x",
    codeHash: "0xdead000000000000000000000000000000000000000000000000000000000000",
    hashType: "data",
  };
}

// return ckb size in shannon
export function calcScriptLength(script: CKBComponents.Script): bigint {
  return BigInt((remove0xPrefix(script.args).length / 2 + 33) * 10 ** 8);
}

export async function waitTx(txHash: CKBComponents.Hash, rpc: Rpc) {
  async function isTxCommitted() {
    try {
      const res: CKBComponents.TransactionWithStatus = await rpc.getTransaction(txHash);
      return res.txStatus.status === "committed";
    } catch (e) {
      console.log(e);
      return false;
    }
  }
  while (await isTxCommitted()) {
    await sleep(5 * 1000);
  }
}

export function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
