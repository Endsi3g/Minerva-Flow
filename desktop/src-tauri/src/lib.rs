use std::io::Write;
use std::net::{IpAddr, TcpStream, ToSocketAddrs};
use std::time::Duration;

use tauri::Manager;

/// Receipt printers are reached over the local network only. The web portal is
/// remote content, so this refuses anything that is not a private address.
fn is_private(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => v4.is_private() || v4.is_loopback() || v4.is_link_local(),
        IpAddr::V6(v6) => v6.is_loopback() || (v6.segments()[0] & 0xfe00) == 0xfc00,
    }
}

/// Full-screen "caisse" mode: fills the screen and keeps the window in front.
#[tauri::command]
fn set_kiosk(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_fullscreen(enabled).map_err(|e| e.to_string())?;
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    Ok(())
}

/// Opens the system print dialog for the current page (tickets, reports).
#[tauri::command]
fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

/// Sends raw ESC/POS bytes to a network thermal printer (port 9100 by default).
#[tauri::command]
fn print_escpos(host: String, port: Option<u16>, data: Vec<u8>) -> Result<(), String> {
    if data.is_empty() || data.len() > 262_144 {
        return Err("Contenu d'impression invalide".into());
    }
    let port = port.unwrap_or(9100);
    if port < 1024 {
        return Err("Port d'imprimante refusé".into());
    }
    let addrs: Vec<_> = (host.as_str(), port)
        .to_socket_addrs()
        .map_err(|_| "Adresse d'imprimante introuvable".to_string())?
        .collect();
    let target = addrs
        .iter()
        .find(|a| is_private(&a.ip()))
        .ok_or_else(|| "Seules les imprimantes du réseau local sont autorisées".to_string())?;
    let mut stream = TcpStream::connect_timeout(target, Duration::from_secs(3))
        .map_err(|_| "Imprimante injoignable".to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| e.to_string())?;
    stream.write_all(&data).map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())
}

#[tauri::command]
fn app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "Minerva Flow",
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![set_kiosk, print_page, print_escpos, app_info])
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de Minerva Flow");
}
