//! Android JNI bridge.

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JClass, JString};
#[cfg(target_os = "android")]
use jni::sys::jstring;

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "system" fn Java_com_agenmonster_MainActivity_getVersion<'local>(
    mut env: JNIEnv<'local>,
    _class: JClass<'local>,
) -> jstring {
    let output = env.new_string("0.7.0").unwrap();
    output.into_raw()
}

#[cfg(not(target_os = "android"))]
pub fn android_stub() {}
