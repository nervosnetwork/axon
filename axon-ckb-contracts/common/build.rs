use std::env;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    let p = env::var_os("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR error?");

    let read_file_path = Path::new(&p).join("..").join("target").join("global_config_type_hash");

    let a = read_file_path.as_path().to_str().unwrap().to_string();

    if read_file_path.exists() {
        println!("cargo:rustc-cfg=gcc_type_hash")
    } else {
        //panic!("{}", a);
        //r#"cargo:rerun-if-changed=build.rs"#
    };
}
