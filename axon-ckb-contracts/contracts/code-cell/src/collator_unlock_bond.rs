use ckb_std::ckb_constants::Source;

use common_raw::{
    cell::{
        code::CodeCellData,
        sidechain_bond::{SidechainBondCellData, SidechainBondCellLockArgs},
        sidechain_state::{SidechainStateCellData, SidechainStateCellTypeArgs},
        sudt_token::SudtTokenData,
    },
    witness::collator_unlock_bond::CollatorUnlockBondWitness,
    FromRaw,
};

use crate::{cell::*, common::*, error::Error};

const SIDECHAIN_BOND_INPUT: CellOrigin = CellOrigin(1, Source::Input);

const SUDT_OUTPUT: CellOrigin = CellOrigin(1, Source::Output);

pub fn collator_unlock_bond(raw_witness: &[u8], signer: [u8; 20]) -> Result<(), Error> {
    /*
    CollatorUnlockBond,

    Dep:    0 Global Config Cell
    Dep:    1 Sidechain Config Cell
    Dep:    2 Sidechain State Cell

    Code Cell                   ->          Code Cell
    Sidechain Bond Cell         ->          Sudt Cell

    */

    let witness = CollatorUnlockBondWitness::from_raw(raw_witness).ok_or(Error::Encoding)?;

    is_collator_unlock_bond(&witness)?;

    let state_origin = CellOrigin(witness.sidechain_state_dep_index, Source::CellDep);
    let (state_dep_type_args, state_dep, bond_input_lock_args) = load_entities! {
        SidechainStateCellTypeArgs: state_origin,
        SidechainStateCellData: state_origin,
        SidechainBondCellLockArgs: SIDECHAIN_BOND_INPUT,
    };

    if state_dep_type_args.chain_id != witness.chain_id {
        return Err(Error::SidechainStateMismatch);
    }
    if signer != bond_input_lock_args.collator_lock_arg
        || bond_input_lock_args.chain_id != witness.chain_id
        || bond_input_lock_args.unlock_sidechain_height < state_dep.committed_block_height
    {
        return Err(Error::SidechainBondMismatch);
    }

    Ok(())
}

fn is_collator_unlock_bond(witness: &CollatorUnlockBondWitness) -> Result<(), Error> {
    let global = check_global_cell()?;

    if is_cell_count_not_equals(2, Source::Input) || is_cell_count_not_equals(2, Source::Output) {
        return Err(Error::CellNumberMismatch);
    }

    check_cells! {
        &global,
        {
            SidechainStateCellData: CellOrigin(witness.sidechain_state_dep_index, Source::CellDep),

            CodeCellData: CODE_INPUT,
            SidechainBondCellData: SIDECHAIN_BOND_INPUT,

            CodeCellData: CODE_OUTPUT,
            SudtTokenData: SUDT_OUTPUT,
        },
    };

    Ok(())
}
