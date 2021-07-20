#![no_std]

use ckb_std::ckb_constants::Source;
use ckb_std::high_level::{load_cell_data, load_cell_type, load_cell_type_hash};

use common_raw::{cell::global_config::GlobalConfigCellData, FromRaw};

#[cfg(not(gcc_type_hash))]
pub const GLOBAL_CONFIG_TYPE_HASH: [u8; 32] = [
    176, 130, 158, 213, 216, 232, 219, 162, 15, 11, 163, 122, 141, 76, 148, 76, 101, 99, 218, 109, 18, 206, 47, 118, 31, 150, 20, 57, 223,
    195, 32, 204,
];

#[cfg(gcc_type_hash)]
pub const GLOBAL_CONFIG_TYPE_HASH: [u8; 32] = include!("../../target/global_config_type_hash");

pub fn check_global_cell() -> Option<GlobalConfigCellData> {
    let global_config_data = (0..)
        .find_map(|i| {
            let type_hash = match load_cell_type_hash(i, Source::CellDep) {
                Ok(hash) => hash,
                Err(err) => return Some(Err(err)),
            }?;
            if type_hash == GLOBAL_CONFIG_TYPE_HASH {
                return load_cell_data(i, Source::CellDep).ok().map(|data| Ok(data));
            }
            None
        })?
        .ok()?;

    let global_config_data = GlobalConfigCellData::from_raw(&global_config_data)?;

    Some(global_config_data)
}

fn check_type_script(index: usize, source: Source, code_hash: &[u8], hash_type: u8) -> Option<()> {
    let script = load_cell_type(index, source).ok()??;

    if script.as_reader().code_hash().raw_data() != code_hash {
        return None;
    }
    if script.as_reader().hash_type().as_slice()[0] != hash_type {
        return None;
    }

    Some(())
}

pub fn check_code_cell() -> Option<()> {
    /*
    CollatorUnlockBond,
    Dep:    0 Global Config Cell
    Dep:    1 .....
    Code Cell                   ->          Code Cell
    ...
    */

    let global = check_global_cell()?;

    check_type_script(0, Source::Input, &global.code_cell_type_codehash, global.code_cell_type_hashtype)?;
    check_type_script(0, Source::Output, &global.code_cell_type_codehash, global.code_cell_type_hashtype)
}
