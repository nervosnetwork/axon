use core::result::Result;

use crate::error::Error;
use common::check_code_cell;

pub fn main() -> Result<(), Error> {
    /*
    related tx:

    1. CollatorSubmitTask
    2. CollatorSubmitChallenge
    3. CheckerTakeBeneficiary
    */

    check_code_cell().ok_or(Error::CodeCellMissing)?;

    Ok(())
}
