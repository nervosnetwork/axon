use crate::{check_args_len, decode_u8, FromRaw};

const CODE_TYPE_ARGS_LEN: usize = 33;
const CODE_TYPE_WITNESS_LEN_MIN: usize = 1;
const CODE_LOCK_ARGS_LEN: usize = 20;
const CODE_LOCK_WITNESS_LEN: usize = 33;
/*

    Code Cell
    Data: null
    Type:
        codehash: typeId
        hashtype: type
        args: chain_id(for lumos)
    Lock:
        codehash: secp256k1
        hashtype: type
        args: public-key
*/

#[derive(Debug, Copy, Clone, PartialOrd, PartialEq, Ord, Eq, Default)]
pub struct CodeCellTypeArgs {
    pub chain_id: u8,
    //pub who_public_key: [u8; 32],
}

impl FromRaw for CodeCellTypeArgs {
    fn from_raw(cell_raw_data: &[u8]) -> Option<CodeCellTypeArgs> {
        check_args_len(cell_raw_data.len(), CODE_TYPE_ARGS_LEN)?;

        let chain_id = decode_u8(&cell_raw_data[0..1])?;

        // let mut who_public_key = [0u8; 32];
        // who_public_key.copy_from_slice(&cell_raw_data[1..33]);

        Some(CodeCellTypeArgs {
            chain_id,
            /* who_public_key */
        })
    }
}

#[derive(Debug, Copy, Clone, PartialOrd, PartialEq, Ord, Eq, Default)]
pub struct CodeCellTypeWitness {
    pub pattern: u8,
}

impl FromRaw for CodeCellTypeWitness {
    fn from_raw(witness_raw_data: &[u8]) -> Option<CodeCellTypeWitness> {
        if witness_raw_data.len() < CODE_TYPE_WITNESS_LEN_MIN {
            return None;
        }

        let pattern = decode_u8(&witness_raw_data[0..1])?;

        Some(CodeCellTypeWitness { pattern })
    }
}

#[derive(Debug, Copy, Clone, PartialOrd, PartialEq, Ord, Eq, Default)]
pub struct CodeCellLockArgs {
    pub public_key_hash: [u8; 20],
}

impl FromRaw for CodeCellLockArgs {
    fn from_raw(arg_raw_data: &[u8]) -> Option<CodeCellLockArgs> {
        check_args_len(arg_raw_data.len(), CODE_LOCK_ARGS_LEN)?;

        let mut public_key_hash = [0u8; CODE_LOCK_ARGS_LEN];
        public_key_hash.copy_from_slice(&arg_raw_data);

        Some(CodeCellLockArgs { public_key_hash })
    }
}