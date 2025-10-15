// Camera, lens, and film type presets for EXIF input
export const CAMERA_DIGITAL_PRESETS = [
  'Canon EOS R5',
  'Canon EOS R6',
  'Canon EOS 5D Mark IV',
  'Canon EOS 6D Mark II',
  'Canon EOS 90D',
  'Nikon Z6 II',
  'Nikon Z7 II',
  'Nikon D850',
  'Nikon D750',
  'Sony A7R IV',
  'Sony A7 III',
  'Sony A6600',
  'Fujifilm X-T4',
  'Fujifilm X-Pro3',
  'Leica Q2',
  'Leica M10',
  'Pentax K-1 Mark II',
  'Olympus OM-D E-M1 Mark III',
  'Panasonic Lumix S5',
  'Hasselblad X1D II',
  'Phase One XF'
].sort();

export const CAMERA_FILM_PRESETS = [
  'Canon AE-1',
  'Canon F-1',
  'Nikon FM2',
  'Nikon F3',
  'Leica M3',
  'Leica M6',
  'Contax G2',
  'Rolleiflex 2.8F',
  'Hasselblad 500C',
  'Mamiya RZ67',
  'Pentax 67',
  'Bronica SQ-A',
  'Yashica Mat-124',
  'Holga 120N',
  'Lomo LC-A',
  'Diana F+',
  'Polaroid SX-70',
  'Instax Mini',
  'Kodak Brownie',
  'Zeiss Ikon'
].sort();

export const CAMERA_PRESETS = [...CAMERA_DIGITAL_PRESETS, ...CAMERA_FILM_PRESETS].sort();

export const LENS_PRESETS = [
  // Canon EF/EF-S
  'Canon EF 50mm f/1.4 USM',
  'Canon EF 85mm f/1.8 USM',
  'Canon EF 24-70mm f/2.8L USM',
  'Canon EF 70-200mm f/2.8L IS USM',
  'Canon EF 16-35mm f/2.8L II USM',
  'Canon EF 100-400mm f/4.5-5.6L IS USM',
  // Canon RF
  'Canon RF 50mm f/1.8 STM',
  'Canon RF 85mm f/2 MACRO IS STM',
  'Canon RF 24-70mm f/2.8L IS USM',
  'Canon RF 70-200mm f/4L IS USM',
  'Canon RF 15-35mm f/2.8L IS USM',
  // Nikon F
  'Nikon AF-S 50mm f/1.8G',
  'Nikon AF-S 85mm f/1.8G',
  'Nikon AF-S 24-70mm f/2.8E ED VR',
  'Nikon AF-S 70-200mm f/2.8E FL ED VR',
  'Nikon AF-S 16-35mm f/4G ED VR',
  // Nikon Z
  'Nikon NIKKOR Z 50mm f/1.8 S',
  'Nikon NIKKOR Z 85mm f/1.8 S',
  'Nikon NIKKOR Z 24-70mm f/2.8 S',
  'Nikon NIKKOR Z 70-200mm f/2.8 VR S',
  'Nikon NIKKOR Z 14-30mm f/4 S',
  // Sony FE
  'Sony FE 50mm f/1.8',
  'Sony FE 85mm f/1.8',
  'Sony FE 24-70mm f/2.8 GM',
  'Sony FE 70-200mm f/2.8 GM OSS',
  'Sony FE 16-35mm f/2.8 GM',
  // Fujifilm X
  'Fujifilm XF 35mm f/2 R WR',
  'Fujifilm XF 56mm f/1.2 R',
  'Fujifilm XF 16-55mm f/2.8 R LM WR',
  'Fujifilm XF 50-140mm f/2.8 R LM OIS WR',
  'Fujifilm XF 10-24mm f/4 R OIS',
  // Leica M
  'Leica Summilux-M 50mm f/1.4 ASPH',
  'Leica Summicron-M 35mm f/2 ASPH',
  'Leica Summilux-M 35mm f/1.4 ASPH',
  'Leica APO-Summicron-M 75mm f/2 ASPH',
  'Leica Elmarit-M 21mm f/2.8 ASPH',
  // Other
  'Samyang 35mm f/1.4',
  'Samyang 85mm f/1.4',
  'Samyang 14mm f/2.8',
  'Tokina 11-16mm f/2.8',
  'Tamron 24-70mm f/2.8',
  'Sigma 35mm f/1.4 Art',
  'Sigma 85mm f/1.4 Art',
  'Sigma 24-70mm f/2.8 Art',
  'Zeiss Otus 55mm f/1.4',
  'Zeiss Milvus 35mm f/1.4',
  'Voigtlander Nokton 40mm f/1.2'
].sort();

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