use ckb_std::{debug, error::SysError};
use common::error::CommonError;

/// Error
#[repr(i8)]
#[derive(Debug)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    CommonError,
    // PatternWitnessTypeMissing,
    // Secp256k1Error,
    // BusyChecker,
    // MissingSignature,
    MissingWitness,
    // PatternCollision,
    // PatternInvalid,
    // ChainIdBitMapMismatch,
    // CheckerInfoMode,
    // CheckerUnpaidFee,
    #[allow(dead_code)]
    TypeScriptMissed,
    Wrong,
    SidechainConfigMismatch,
    CheckerBondMismatch,
    CheckerInfoMismatch,
    TaskMismatch,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        use SysError::*;
        match err {
            IndexOutOfBound => Self::IndexOutOfBound,
            ItemMissing => Self::ItemMissing,
            LengthNotEnough(_) => Self::LengthNotEnough,
            Encoding => Self::Encoding,
            Unknown(err_code) => panic!("unexpected sys error {}", err_code),
        }
    }
}

impl From<CommonError> for Error {
    fn from(_err: CommonError) -> Self {
        debug!("CommonError: {:#?}", _err);
        Self::CommonError
    }
}
