use common::ckb_std::error::SysError;
use common::error::CommonError;

/// Error
#[repr(i8)]
#[derive(Debug)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    MissingTypeScript,
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
    fn from(err: CommonError) -> Self {
        match err {
            CommonError::MissingTypeScript => Self::MissingTypeScript,
            _ => Self::MissingTypeScript,
        }
    }
}
