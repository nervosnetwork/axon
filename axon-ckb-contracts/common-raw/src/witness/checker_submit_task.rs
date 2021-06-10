use crate::{decode_u8, FromRaw};

#[derive(Debug)]
pub struct CheckerSubmitTaskWitness {
    pub pattern:    u8,
    pub chain_id:   u8,
    pub checker_id: u8,
}

impl FromRaw for CheckerSubmitTaskWitness {
    fn from_raw(witness_raw_data: &[u8]) -> Option<CheckerSubmitTaskWitness> {
        if witness_raw_data.len() < 3 {
            return None;
        }

        let pattern = decode_u8(&witness_raw_data[0..1])?;
        let chain_id = decode_u8(&witness_raw_data[1..2])?;
        let checker_id = decode_u8(&witness_raw_data[2..3])?;

        Some(CheckerSubmitTaskWitness {
            pattern,
            chain_id,
            checker_id,
        })
    }
}