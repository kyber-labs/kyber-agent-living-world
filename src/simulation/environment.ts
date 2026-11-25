// Target suasana 3D (langit, matahari, kabut, posisi matahari) per
// periode hari + cuaca — Phase 5. Dipindah ke modul murni di 8.2 supaya
// nilainya bisa diuji tanpa DOM/renderer (createWorld hanya mengimpor).
//
// Periode Sore = SENJA (8.2): langit jingga hangat, matahari rendah di
// barat dan hangat, cahaya melemah. Ini pendekatan senja lewat parameter
// suasana yang sudah ada — bukan skybox baru; jam/cuaca tidak berubah
// (1 hari simulasi = 10 menit nyata tetap berlaku).

import * as THREE from 'three';
import type { DayPeriod, WeatherKind } from './lifeSim';

/** Target suasana (langit, matahari, kabut) per periode hari + cuaca. */
export interface EnvTargets {
  sky: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiIntensity: number;
  fogNear: number;
  fogFar: number;
  /** Posisi matahari (directional light) — sore = rendah di barat. */
  sunPos: THREE.Vector3;
}

export function environmentTargets(period: DayPeriod, weather: WeatherKind): EnvTargets {
  // Phase 9: langit Pagi/Siang dihangatkan (dulu 0xbfd9f2/0x9ecfec yang
  // dingin) — nuansa golden hour terasa di sebagian besar waktu.
  // 9.1: cahaya lebih hangat + bayangan lebih tegas (dulu Siang 1,9 /
  // hemi 1,0 dan Pagi 1,6 / 0,9 — cahaya isi terlalu kuat sehingga
  // bayangan arah nyaris tidak terbaca; matahari Siang 0xfff3d6 ->
  // 0xffe9b0, lebih kuning emas). Sore tetap 1,1 (diperiksa
  // phase82-test); Malam tetap.
  let sky = 0xccd9e4;
  let sun = 0xfff2dd;
  let sunIntensity = 1.8;
  let hemiIntensity = 0.8;
  let fogNear = 90;
  let fogFar = 180;
  let sunPos = new THREE.Vector3(20, 30, 10);
  if (period === 'siang') {
    sky = 0xbcd9e6;
    sun = 0xffe9b0;
    sunIntensity = 2.2;
    hemiIntensity = 0.85;
    sunPos = new THREE.Vector3(15, 35, 10);
  } else if (period === 'sore') {
    // Senja: langit jingga, matahari rendah dan hangat, cahaya melemah.
    sky = 0xe8894f;
    sun = 0xff9e4a;
    sunIntensity = 1.1;
    hemiIntensity = 0.55;
    fogNear = 78;
    fogFar = 165;
    sunPos = new THREE.Vector3(30, 10, 15);
  } else if (period === 'malam') {
    sky = 0x232f45;
    sun = 0x93a8cc;
    sunIntensity = 0.35;
    hemiIntensity = 0.35;
    fogNear = 70;
    fogFar = 150;
    sunPos = new THREE.Vector3(20, 30, 10);
  }
  if (weather === 'berawan') {
    sunIntensity *= 0.8;
    hemiIntensity *= 0.9;
    fogNear = Math.min(fogNear, 65);
    fogFar = Math.min(fogFar, 140);
  } else if (weather === 'hujan') {
    sky = 0x7d8ea3;
    sunIntensity *= 0.55;
    hemiIntensity *= 0.7;
    fogNear = 45;
    fogFar = 110;
  }
  return {
    sky: new THREE.Color(sky),
    sunColor: new THREE.Color(sun),
    sunIntensity,
    hemiIntensity,
    fogNear,
    fogFar,
    sunPos,
  };
}
