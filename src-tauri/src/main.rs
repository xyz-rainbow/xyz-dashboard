// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 *  __   __  ________
 *  \ \ / / |___  __/
 *   \ V /      / /   
 *    > <      / /    
 *   / ^ \    / /___  
 *  /_/ \_\  /______/ 
 * 
 * XYZ Dashboard - Núcleo del Sistema (Tauri)
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

fn main() {
    // Firma oculta ofuscada
    // I3h5ei1yYWluYm93dGVjaG5vbG9neQ==
    let _s = "I3h5ei1yYWluYm93dGVjaG5vbG9neQ==";
    xyz_dashboard_lib::run()
}
