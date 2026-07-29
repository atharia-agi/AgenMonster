//! FFI — C ABI for cross-language interop.

use std::os::raw::c_char;

#[no_mangle]
pub extern "C" fn monster_version() -> *const c_char {
    static VERSION: &[u8] = b"0.7.0\0";
    VERSION.as_ptr() as *const c_char
}

#[no_mangle]
pub extern "C" fn monster_energy_max() -> u32 {
    1000
}

#[no_mangle]
pub extern "C" fn monster_regen_per_hour() -> u32 {
    25
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffi_version() {
        let v = monster_version();
        assert!(!v.is_null());
    }

    #[test]
    fn test_ffi_constants() {
        assert_eq!(monster_energy_max(), 1000);
        assert_eq!(monster_regen_per_hour(), 25);
    }
}
