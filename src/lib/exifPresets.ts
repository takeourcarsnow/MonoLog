// Camera, lens, and film type presets for EXIF input
export const CAMERA_DIGITAL_PRESETS = [
  // Canon
  'Canon EOS R5',
  'Canon EOS R6',
  'Canon EOS R3',
  'Canon EOS 5D Mark IV',
  'Canon EOS 6D Mark II',
  'Canon EOS 90D',
  'Canon EOS M50',
  'Canon EOS 7D Mark II',

  // Nikon
  'Nikon Z9',
  'Nikon Z7 II',
  'Nikon Z6 II',
  'Nikon D850',
  'Nikon D780',
  'Nikon D750',
  'Nikon D500',

  // Sony
  'Sony A1',
  'Sony A7R IV',
  'Sony A7 III',
  'Sony A7C',
  'Sony A6600',
  'Sony A6400',

  // Fujifilm
  'Fujifilm X-T4',
  'Fujifilm X-T3',
  'Fujifilm X-Pro3',
  'Fujifilm X-H2',

  // Panasonic / Lumix
  'Panasonic Lumix S5',
  'Panasonic Lumix S1',
  'Panasonic Lumix S1R',
  'Panasonic Lumix GH5',
  'Panasonic Lumix GH5 II',
  'Panasonic Lumix G9',
  'Panasonic Lumix GX8',
  'Panasonic Lumix GX9',

  // Olympus / OM System
  'Olympus OM-D E-M1 Mark III',
  'Olympus OM-D E-M1 Mark II',
  'Olympus OM-D E-M5 Mark III',
  'Olympus OM-D E-M10 Mark IV',
  'Olympus PEN-F',
  'Olympus E-M1X',

  // Leica / Medium format
  'Leica Q2',
  'Leica Q',
  'Leica M10',
  'Leica M11',
  'Leica SL2',
  'Hasselblad X1D II',
  'Hasselblad 907X',
  'Hasselblad H6D-100c',
  'Hasselblad 503CW',
  'Fujifilm GFX 100S',
  'Phase One XF',
  'Phase One IQ4',

  // Pentax
  'Pentax K-1 Mark II',
  'Pentax K-3 II',
  'Pentax K-70',
  'Pentax 645Z',

  // Others
  'Ricoh GR III',
  'Sigma fp'
].sort();

export const CAMERA_FILM_PRESETS = [
  // 35mm SLRs
  'Canon AE-1',
  'Canon A-1',
  'Canon F-1',
  'Canon EOS 1V (film)',
  'Nikon FM2',
  'Nikon FE2',
  'Nikon F3',
  'Nikon F100',
  'Minolta SRT-101',
  'Minolta SRT-201',
  'Minolta X-700',
  'Pentax K1000',
  'Pentax Spotmatic',
  'Pentax LX',
  'Olympus OM-1',
  'Olympus OM-2',

  // Rangefinders / compact film cameras
  'Leica M3',
  'Leica M6',
  'Leica CL',
  'Contax G2',
  'Contax RTS',
  'Contax T2',
  'Contax T3',
  'Ricoh GR1 (film)',
  'Canonet QL17 GIII',
  'Yashica Electro 35',

  // Medium format
  'Rolleiflex 2.8F',
  'Hasselblad 500C',
  'Mamiya RZ67',
  'Mamiya 645',
  'Pentax 67',
  'Bronica SQ-A',

  // TLR / classic
  'Yashica Mat-124',
  'Kodak Brownie',
  'Zeiss Ikon',

  // Toy / instant / plastic
  'Holga 120N',
  'Lomo LC-A',
  'Diana F+',
  'Polaroid SX-70',
  'Instax Mini',
  'Polaroid 600',

  // Other collectible/popular film bodies
  // Soviet / Russian range and SLRs
  'Zenit-E',
  'Zenit TTL',
  'Zenit 3M',
  'Zenit 12XP',
  'Zenit 11',
  'FED 2',
  'FED 3',
  'FED 5',
  'Zorki 4',
  'Zorki 3',
  'Zorki 6',
  'KMZ Moskva',
  'KMZ Start',
  'Kiev 4A',
  'Kiev 88',
  'Kiev 4',

  'Canon Sure Shot/Autoboy (point & shoot)',
  'Fujifilm Klasse S',
  'Konica Hexar AF',
  'Yashica T4',
  'Olympus XA',
  'Nikon S3 (rangefinder)'
].sort();

// Build a grouped camera list with manufacturer separators for the dropdown.
// The Combobox treats options that start with '───' as separators.
const ALL_CAMERAS = [...CAMERA_DIGITAL_PRESETS, ...CAMERA_FILM_PRESETS];
const grouped = new Map<string, string[]>();
for (const cam of (ALL_CAMERAS || []).sort()) {
  // Derive a manufacturer key by taking the first token and extracting
  // the alphabetic prefix. This maps 'Zenit-E' and 'Zenit 3M' -> 'Zenit',
  // and turns variants like 'Canon' or 'Nikon' into their base keys.
  const first = (cam.split(' ')[0] || 'Other').toString();
  const m = first.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/);
  const key = m ? m[0] : first;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key)!.push(cam);
}

export const CAMERA_PRESETS: string[] = [];
for (const mfg of Array.from(grouped.keys()).sort()) {
  CAMERA_PRESETS.push(`─── ${mfg} ───`);
  CAMERA_PRESETS.push(...(grouped.get(mfg) || []));
}

export const LENS_PRESETS = [
  // Wide Angle Lenses (< 35mm)
  '─── Wide Angle ───',
  'Fujifilm XF 10-24mm f/4 R OIS',
  'Tokina 11-16mm f/2.8',
  'Samyang 12mm f/2.0 NCS CS',
  'Samyang 14mm f/2.8',
  'Nikon NIKKOR Z 14-30mm f/4 S',
  'Canon RF 15-35mm f/2.8L IS USM',
  'Voigtlander Super Wide-Heliar 15mm f/4.5',
  'Laowa 15mm f/2 Zero-D',
  'Canon EF 16-35mm f/2.8L II USM',
  'Nikon AF-S 16-35mm f/4G ED VR',
  'Sony FE 16-35mm f/2.8 GM',
  'Leica Elmarit-M 21mm f/2.8 ASPH',
  'Samyang 8mm f/3.5 Fisheye',
  'Nikon AF DX 10.5mm f/2.8G ED',
  'Canon EF 8-15mm f/4L Fisheye USM',
  'Zenitar 16mm f/2.8 Fisheye',
  'Peleng 8mm f/3.5 Fisheye',
  'Mir-1B 37mm f/2.8',
  'Samyang 10mm f/2.8 ED AS NCS CS',

  // Normal/Standard Lenses (35-70mm)
  '─── Normal ───',
  'Voigtlander Nokton 40mm f/1.2',
  'Leica Summicron-M 35mm f/2 ASPH',
  'Leica Summilux-M 35mm f/1.4 ASPH',
  'Fujifilm XF 35mm f/2 R WR',
  'Samyang 35mm f/1.4',
  'Sigma 35mm f/1.4 Art',
  'Zeiss Milvus 35mm f/1.4',
  'Leica Summilux-M 50mm f/1.4 ASPH',
  'Canon EF 50mm f/1.4 USM',
  'Nikon AF-S 50mm f/1.8G',
  'Sony FE 50mm f/1.8',
  'Canon RF 50mm f/1.8 STM',
  'Nikon NIKKOR Z 50mm f/1.8 S',
  'Jupiter-8 50mm f/2',
  'Pentacon 50mm f/1.8',
  'Carl Zeiss Jena Pancolar 50mm f/1.8',
  'Zeiss Otus 55mm f/1.4',
  'Industar-61 L/Z 55mm f/2.8',
  'Fujifilm XF 56mm f/1.2 R',
  'Helios 44-2 58mm f/2',
  'Fujifilm XF 16-55mm f/2.8 R LM WR',
  'Canon EF 24-70mm f/2.8L USM',
  'Nikon AF-S 24-70mm f/2.8E ED VR',
  'Sony FE 24-70mm f/2.8 GM',
  'Canon RF 24-70mm f/2.8L IS USM',
  'Nikon NIKKOR Z 24-70mm f/2.8 S',
  'Tamron 24-70mm f/2.8',
  'Sigma 24-70mm f/2.8 Art',
  'Tokina AT-X 24-70mm f/2.8 PRO FX',

  // Telephoto Lenses (> 70mm)
  '─── Telephoto ───',
  'Fujifilm XF 50-140mm f/2.8 R LM OIS WR',
  'Canon EF 70-200mm f/2.8L IS USM',
  'Nikon AF-S 70-200mm f/2.8E FL ED VR',
  'Sony FE 70-200mm f/2.8 GM OSS',
  'Canon RF 70-200mm f/4L IS USM',
  'Nikon NIKKOR Z 70-200mm f/2.8 VR S',
  'Canon EF 100-400mm f/4.5-5.6L IS USM',
  'Leica APO-Summicron-M 75mm f/2 ASPH',
  'Voigtlander APO-Lanthar 65mm f/2 Aspherical',
  'Canon EF 85mm f/1.8 USM',
  'Nikon AF-S 85mm f/1.8G',
  'Sony FE 85mm f/1.8',
  'Canon RF 85mm f/2 MACRO IS STM',
  'Nikon NIKKOR Z 85mm f/1.8 S',
  'Samyang 85mm f/1.4',
  'Sigma 85mm f/1.4 Art',
  'Carl Zeiss Planar T* 85mm f/1.4',
  'Jupiter-9 85mm f/2',
  'Helios 40-2 85mm f/1.5',
  'Samyang 135mm f/2.0 ED UMC',
  'Canon EF 135mm f/2L USM',
  'Nikon AF-S 135mm f/2 DC',
  'Tair-3S 300mm f/4.5'
];

export const FILM_TYPE_PRESETS = [
  // Color negative
  'Kodak Portra 400',
  'Kodak Portra 800',
  'Kodak Ektar 100',
  'Fujifilm Provia 100F',
  'Fujifilm Velvia 50',
  'Fujifilm Velvia 100',
  'Fujifilm Astia 100F',
  'Agfa Precisa CT100',
  'Ilford XP2 Super',
  // Black and white
  'Kodak Tri-X 400',
  'Kodak T-Max 100',
  'Kodak T-Max 400',
  'Ilford HP5 Plus',
  'Ilford Delta 100',
  'Ilford Delta 400',
  'Ilford FP4 Plus',
  'Fomapan 100',
  'Fomapan 400',
  'Bergger Pancro 400',
  // Specialty
  'Kodak Aerochrome',
  'Polaroid 600',
  'Instax Mini Film',
  'Kodak Ektachrome',
  'Agfa Scala',
  'Ilford SFX 200',
  'Kodak Infrared HIE',
  'Fujifilm Neopan Acros 100',
  'Adox CMS 20',
  'Lomography Earl Grey'
].sort();

export const FILM_PRESETS = [
  // Color negative
  'Kodak Portra',
  'Kodak Ektar',
  'Fujifilm Provia',
  'Fujifilm Velvia',
  'Fujifilm Astia',
  'Agfa Precisa',
  'Ilford XP2 Super',
  // Black and white
  'Kodak Tri-X',
  'Kodak T-Max',
  'Ilford HP5 Plus',
  'Ilford Delta',
  'Ilford FP4 Plus',
  'Fomapan',
  'Bergger Pancro',
  // Specialty
  'Kodak Aerochrome',
  'Polaroid 600',
  'Instax Mini Film',
  'Kodak Ektachrome',
  'Agfa Scala',
  'Ilford SFX 200',
  'Kodak Infrared HIE',
  'Fujifilm Neopan Acros',
  'Adox CMS 20',
  'Lomography Earl Grey'
].sort();

export const ISO_PRESETS = [
  '50',
  '100',
  '200',
  '400',
  '800',
  '1600',
  '3200',
  '100F',
  'CT100'
].sort();