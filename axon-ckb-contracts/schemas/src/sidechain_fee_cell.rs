// Generated by Molecule 0.7.0

use super::common::basic_types::*;
use molecule::prelude::*;
#[derive(Clone)]
pub struct SFC(molecule::bytes::Bytes);
impl ::core::fmt::LowerHex for SFC {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        use molecule::hex_string;
        if f.alternate() {
            write!(f, "0x")?;
        }
        write!(f, "{}", hex_string(self.as_slice()))
    }
}
impl ::core::fmt::Debug for SFC {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        write!(f, "{}({:#x})", Self::NAME, self)
    }
}
impl ::core::fmt::Display for SFC {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        write!(f, "{} {{ ", Self::NAME)?;
        write!(f, "{}: {}", "amount", self.amount())?;
        write!(f, " }}")
    }
}
impl ::core::default::Default for SFC {
    fn default() -> Self {
        let v: Vec<u8> = vec![0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        SFC::new_unchecked(v.into())
    }
}
impl SFC {
    pub const TOTAL_SIZE: usize = 16;
    pub const FIELD_SIZES: [usize; 1] = [16];
    pub const FIELD_COUNT: usize = 1;
    pub fn amount(&self) -> Uint128 {
        Uint128::new_unchecked(self.0.slice(0..16))
    }
    pub fn as_reader<'r>(&'r self) -> SFCReader<'r> {
        SFCReader::new_unchecked(self.as_slice())
    }
}
impl molecule::prelude::Entity for SFC {
    type Builder = SFCBuilder;
    const NAME: &'static str = "SFC";
    fn new_unchecked(data: molecule::bytes::Bytes) -> Self {
        SFC(data)
    }
    fn as_bytes(&self) -> molecule::bytes::Bytes {
        self.0.clone()
    }
    fn as_slice(&self) -> &[u8] {
        &self.0[..]
    }
    fn from_slice(slice: &[u8]) -> molecule::error::VerificationResult<Self> {
        SFCReader::from_slice(slice).map(|reader| reader.to_entity())
    }
    fn from_compatible_slice(slice: &[u8]) -> molecule::error::VerificationResult<Self> {
        SFCReader::from_compatible_slice(slice).map(|reader| reader.to_entity())
    }
    fn new_builder() -> Self::Builder {
        ::core::default::Default::default()
    }
    fn as_builder(self) -> Self::Builder {
        Self::new_builder().amount(self.amount())
    }
}
#[derive(Clone, Copy)]
pub struct SFCReader<'r>(&'r [u8]);
impl<'r> ::core::fmt::LowerHex for SFCReader<'r> {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        use molecule::hex_string;
        if f.alternate() {
            write!(f, "0x")?;
        }
        write!(f, "{}", hex_string(self.as_slice()))
    }
}
impl<'r> ::core::fmt::Debug for SFCReader<'r> {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        write!(f, "{}({:#x})", Self::NAME, self)
    }
}
impl<'r> ::core::fmt::Display for SFCReader<'r> {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        write!(f, "{} {{ ", Self::NAME)?;
        write!(f, "{}: {}", "amount", self.amount())?;
        write!(f, " }}")
    }
}
impl<'r> SFCReader<'r> {
    pub const TOTAL_SIZE: usize = 16;
    pub const FIELD_SIZES: [usize; 1] = [16];
    pub const FIELD_COUNT: usize = 1;
    pub fn amount(&self) -> Uint128Reader<'r> {
        Uint128Reader::new_unchecked(&self.as_slice()[0..16])
    }
}
impl<'r> molecule::prelude::Reader<'r> for SFCReader<'r> {
    type Entity = SFC;
    const NAME: &'static str = "SFCReader";
    fn to_entity(&self) -> Self::Entity {
        Self::Entity::new_unchecked(self.as_slice().to_owned().into())
    }
    fn new_unchecked(slice: &'r [u8]) -> Self {
        SFCReader(slice)
    }
    fn as_slice(&self) -> &'r [u8] {
        self.0
    }
    fn verify(slice: &[u8], _compatible: bool) -> molecule::error::VerificationResult<()> {
        use molecule::verification_error as ve;
        let slice_len = slice.len();
        if slice_len != Self::TOTAL_SIZE {
            return ve!(Self, TotalSizeNotMatch, Self::TOTAL_SIZE, slice_len);
        }
        Ok(())
    }
}
#[derive(Debug, Default)]
pub struct SFCBuilder {
    pub(crate) amount: Uint128,
}
impl SFCBuilder {
    pub const TOTAL_SIZE: usize = 16;
    pub const FIELD_SIZES: [usize; 1] = [16];
    pub const FIELD_COUNT: usize = 1;
    pub fn amount(mut self, v: Uint128) -> Self {
        self.amount = v;
        self
    }
}
impl molecule::prelude::Builder for SFCBuilder {
    type Entity = SFC;
    const NAME: &'static str = "SFCBuilder";
    fn expected_length(&self) -> usize {
        Self::TOTAL_SIZE
    }
    fn write<W: ::molecule::io::Write>(&self, writer: &mut W) -> ::molecule::io::Result<()> {
        writer.write_all(self.amount.as_slice())?;
        Ok(())
    }
    fn build(&self) -> Self::Entity {
        let mut inner = Vec::with_capacity(self.expected_length());
        self.write(&mut inner)
            .unwrap_or_else(|_| panic!("{} build should be ok", Self::NAME));
        SFC::new_unchecked(inner.into())
    }
}
