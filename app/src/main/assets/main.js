import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let shaderFailed = false;
const origError = console.error;
const errLog = document.getElementById('error-log');
const fallbackToast = document.getElementById('fallback-toast');

console.error = function(...args) {
    const msg = args.join(' ').toLowerCase();
    if (msg.includes('shader') || msg.includes('webgl')) {
        if (!shaderFailed) {
            shaderFailed = true;
            if (fallbackToast) fallbackToast.style.display = 'block';
            console.log("SHADER FAILURE DETECTED: Switching to Fallback CPU Particle System.");
        }
    }
    origError.apply(console, args);
};

// Catch WebGL context loss
const canvasElem = document.createElement('canvas');
canvasElem.addEventListener("webglcontextlost", function(event) {
    event.preventDefault();
    if (!shaderFailed) {
        shaderFailed = true;
        if (fallbackToast) fallbackToast.style.display = 'block';
    }
}, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 25);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: canvasElem });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

const geometry = new THREE.BoxGeometry(30, 30, 30);

const uniforms = {
    u_mode: { value: 0 },
    u_n: { value: 3 },
    u_l: { value: 2 },
    u_m: { value: 0 },
    u_z: { value: 1.0 },
    u_e_field: { value: 0.0 },
    u_b_field: { value: 0.0 },
    u_time: { value: 0.0 },
    u_density: { value: 1.0 },
    u_mu: { value: 1.0 }, 
    u_cameraPos: { value: camera.position },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

let material;
try {
    material = new THREE.ShaderMaterial({
        vertexShader: window.volumeVS,
        fragmentShader: window.volumeFS,
        uniforms: uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide
    });
} catch(e) {
    shaderFailed = true;
    if (fallbackToast) fallbackToast.style.display = 'block';
}

const volumeMesh = new THREE.Mesh(geometry, material || new THREE.MeshBasicMaterial());
scene.add(volumeMesh);

// --- FALLBACK PARTICLE SYSTEM (Monte Carlo CPU/GPU Hybrid) ---
const particleCount = 150000;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const randoms = new Float32Array(particleCount);

for(let i=0; i<particleCount; i++) {
    // Generate Monte Carlo initial sampling positions 
    let r_unif = 15.0 * Math.pow(Math.random(), 1/3);
    let theta = Math.acos(2.0 * Math.random() - 1.0);
    let phi = 2.0 * Math.PI * Math.random();
    positions[i*3] = r_unif * Math.sin(theta) * Math.cos(phi);
    positions[i*3+1] = r_unif * Math.cos(theta);
    positions[i*3+2] = r_unif * Math.sin(theta) * Math.sin(phi);
    randoms[i] = Math.random(); // Rejection sampling threshold
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('a_random', new THREE.BufferAttribute(randoms, 1));

const particleMat = new THREE.ShaderMaterial({
    vertexShader: window.particleVS,
    fragmentShader: window.particleFS,
    uniforms: uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(particleGeo, particleMat);
particleSystem.visible = false;
scene.add(particleSystem);

// --- QUANTUM NUCLEUS (Nuclear Shell Model) ---
const nucleusGroup = new THREE.Group();
scene.add(nucleusGroup);

const nucleonGeo = new THREE.SphereGeometry(0.12, 16, 16);
const nucleonMatProton = new THREE.MeshStandardMaterial({ 
    color: 0xff4444, 
    emissive: 0x440000,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9
});
const nucleonMatNeutron = new THREE.MeshStandardMaterial({ 
    color: 0x4488ff,
    emissive: 0x000044,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9
});

const ambientLight = new THREE.AmbientLight(0x404040); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

let nucleons = [];

function buildNucleus(Z, N) {
    nucleons.forEach(n => nucleusGroup.remove(n));
    nucleons = [];

    let A = Z + N;
    
    const m_e = 1;
    const m_p = 1836;
    const m_N = A * m_p;
    const mu = (m_e * m_N) / (m_e + m_N);
    uniforms.u_mu.value = mu;

    const shellCapacities = [2, 6, 12, 20, 30, 42, 56]; // Approximate spatial shells
    
    function placeNucleons(count, isProton) {
        let currentShell = 0;
        let shellPlaced = 0;
        
        for(let i=0; i<count; i++) {
            if (shellPlaced >= shellCapacities[currentShell]) {
                currentShell++;
                shellPlaced = 0;
            }
            
            // Spatial quantization based on shells
            let radius = 0.15 + currentShell * 0.22;
            if (currentShell === 0) radius = 0.08; 
            if (A === 1) radius = 0;
            
            let theta = Math.acos(2 * Math.random() - 1);
            let phi = 2 * Math.PI * Math.random();
            
            let mesh = new THREE.Mesh(nucleonGeo, isProton ? nucleonMatProton : nucleonMatNeutron);
            
            mesh.userData.basePos = new THREE.Vector3(
                radius * Math.sin(theta) * Math.cos(phi),
                radius * Math.cos(theta),
                radius * Math.sin(theta) * Math.sin(phi)
            );
            
            mesh.position.copy(mesh.userData.basePos);
            
            // Quantum confinement jitter parameters
            mesh.userData.phase = Math.random() * Math.PI * 2;
            mesh.userData.freq = 15.0 + Math.random() * 20.0; 
            mesh.userData.jitterRadius = 0.03 + (currentShell * 0.01);
            
            nucleons.push(mesh);
            nucleusGroup.add(mesh);
            
            shellPlaced++;
        }
    }
    
    placeNucleons(Z, true);
    placeNucleons(N, false);
}

// UI Elements
const modeSelect = document.getElementById('mode-select');
const presetSelect = document.getElementById('preset-select');
const nSlider = document.getElementById('n-slider');
const lSlider = document.getElementById('l-slider');
const mSlider = document.getElementById('m-slider');
const zSlider = document.getElementById('z-slider');
const nNeutronSlider = document.getElementById('n-neutron-slider');
const eSlider = document.getElementById('e-slider');
const bSlider = document.getElementById('b-slider');
const dSlider = document.getElementById('density-slider');
const spectraCanvas = document.getElementById('spectra-canvas');
const ctx = spectraCanvas.getContext('2d');

let currentZ = -1;
let currentN = -1;

function updateUIState() {
    const mode = parseInt(modeSelect.value);
    document.querySelectorAll('.state-group').forEach(el => el.style.display = (mode === 0) ? 'flex' : 'none');
    document.querySelectorAll('.z-group').forEach(el => el.style.display = (mode === 1) ? 'flex' : 'none');
    if (mode === 2) document.getElementById('e-val').innerText = eSlider.value;
}

function wvlToRGB(wvl) {
    let r=0, g=0, b=0;
    if (wvl >= 380 && wvl < 440) { r = -(wvl - 440)/60; g = 0.0; b = 1.0; }
    else if (wvl >= 440 && wvl < 490) { r = 0.0; g = (wvl - 440)/50; b = 1.0; }
    else if (wvl >= 490 && wvl < 510) { r = 0.0; g = 1.0; b = -(wvl - 510)/20; }
    else if (wvl >= 510 && wvl < 580) { r = (wvl - 510)/70; g = 1.0; b = 0.0; }
    else if (wvl >= 580 && wvl < 645) { r = 1.0; g = -(wvl - 645)/65; b = 0.0; }
    else if (wvl >= 645 && wvl <= 780) { r = 1.0; g = 0.0; b = 0.0; }
    let factor = (wvl >= 380 && wvl < 420) ? 0.3 + 0.7*(wvl - 380)/40 : (wvl >= 700 && wvl <= 780) ? 0.3 + 0.7*(780 - wvl)/80 : 1.0;
    return `rgb(${Math.round(r*255*factor)}, ${Math.round(g*255*factor)}, ${Math.round(b*255*factor)})`;
}

function drawSpectra() {
    ctx.clearRect(0, 0, spectraCanvas.width, spectraCanvas.height);
    const mode = parseInt(modeSelect.value);
    let Z = (mode === 1) ? parseFloat(zSlider.value) : 1;
    document.getElementById('spectra-label').innerText = `Z=${Z} Series`;
    const bField = parseFloat(bSlider.value);
    
    for(let n1 = 1; n1 <= 3; n1++) {
        for(let n2 = n1 + 1; n2 <= 6; n2++) {
            let E1 = -13.6 * (Z * Z) / (n1 * n1);
            let E2 = -13.6 * (Z * Z) / (n2 * n2);
            let splits = [-1, 0, 1]; 
            for(let split of splits) {
                let dE = Math.abs(E2 - E1) + split * bField * 0.5;
                if (dE > 0) {
                    let wvl = 1240 / dE;
                    if (wvl >= 380 && wvl <= 780) {
                        let x = ((wvl - 380) / 400) * spectraCanvas.width;
                        ctx.fillStyle = wvlToRGB(wvl);
                        ctx.globalAlpha = split === 0 ? 1.0 : (bField > 0 ? 0.6 : 0.0);
                        ctx.fillRect(x, 0, split === 0 ? 3 : 1, spectraCanvas.height);
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        }
    }
}

function updateUniforms(e) {
    if (e && e.target && e.target.id !== 'preset-select') presetSelect.value = 'custom';
    updateUIState();
    
    const mode = parseInt(modeSelect.value);
    uniforms.u_mode.value = mode;
    
    let n = parseInt(nSlider.value);
    let l = parseInt(lSlider.value);
    let m = parseInt(mSlider.value);
    
    if (l >= n) { l = n - 1; lSlider.value = l; }
    lSlider.max = n - 1;
    if (Math.abs(m) > l) { m = m > 0 ? l : -l; mSlider.value = m; }
    mSlider.min = -l; mSlider.max = l;
    
    let Z = (mode === 1) ? parseInt(zSlider.value) : 1;
    let N = (mode === 1) ? parseInt(nNeutronSlider.value) : 0;
    
    // Auto-update default neutrons if just preset was changed and N hasn't been manually set
    if (e && e.target && e.target.id === 'z-slider') {
        N = Math.round(Z * (Z > 2 ? 1.2 : 1.0)); // Rough isotope stable line
        nNeutronSlider.value = N;
    } else if (e && e.target && e.target.id === 'preset-select') {
        if (Z === 2) { N = 2; nNeutronSlider.value = 2; }
        if (Z === 10) { N = 10; nNeutronSlider.value = 10; }
    }
    
    if (Z !== currentZ || N !== currentN) {
        buildNucleus(Z, N);
        currentZ = Z;
        currentN = N;
    }

    document.getElementById('n-val').innerText = n;
    document.getElementById('l-val').innerText = l;
    document.getElementById('m-val').innerText = m;
    document.getElementById('z-val').innerText = Z;
    document.getElementById('n-neutron-val').innerText = N;
    document.getElementById('e-val').innerText = eSlider.value;
    document.getElementById('b-val').innerText = bSlider.value;
    document.getElementById('density-val').innerText = dSlider.value;
    
    uniforms.u_n.value = n;
    uniforms.u_l.value = l;
    uniforms.u_m.value = m;
    uniforms.u_z.value = Z;
    uniforms.u_e_field.value = parseFloat(eSlider.value);
    uniforms.u_b_field.value = parseFloat(bSlider.value);
    uniforms.u_density.value = parseFloat(dSlider.value);
    
    drawSpectra();
}

modeSelect.addEventListener('change', updateUniforms);
presetSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') return;
    if (val === 'h_1s') { modeSelect.value = "0"; nSlider.value = "1"; lSlider.value = "0"; mSlider.value = "0"; eSlider.value = "0.0"; bSlider.value = "0.0"; }
    else if (val === 'h_2p') { modeSelect.value = "0"; nSlider.value = "2"; lSlider.value = "1"; mSlider.value = "0"; eSlider.value = "0.0"; bSlider.value = "0.0"; }
    else if (val === 'h_3d') { modeSelect.value = "0"; nSlider.value = "3"; lSlider.value = "2"; mSlider.value = "0"; eSlider.value = "0.0"; bSlider.value = "0.0"; }
    else if (val === 'he_1s2') { modeSelect.value = "1"; zSlider.value = "2"; nNeutronSlider.value = "2"; eSlider.value = "0.0"; bSlider.value = "0.0"; }
    else if (val === 'ne_ground') { modeSelect.value = "1"; zSlider.value = "10"; nNeutronSlider.value = "10"; eSlider.value = "0.0"; bSlider.value = "0.0"; }
    else if (val === 'tdse_rabi') { modeSelect.value = "2"; eSlider.value = "0.5"; bSlider.value = "0.0"; }
    updateUniforms({ target: { id: 'preset-select' } });
});
nSlider.addEventListener('input', updateUniforms);
lSlider.addEventListener('input', updateUniforms);
mSlider.addEventListener('input', updateUniforms);
zSlider.addEventListener('input', updateUniforms);
nNeutronSlider.addEventListener('input', updateUniforms);
eSlider.addEventListener('input', updateUniforms);
bSlider.addEventListener('input', updateUniforms);
dSlider.addEventListener('input', updateUniforms);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
});

let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    let t = clock.getElapsedTime();
    uniforms.u_time.value = t;
    uniforms.u_cameraPos.value.copy(camera.position);

    // Apply Quantum Confinement Jitter to nucleons
    nucleons.forEach(n => {
        if (n.userData.basePos) {
            n.position.copy(n.userData.basePos);
            // High-frequency jitter mimicking zero-point energy inside potential well
            let jitterX = n.userData.jitterRadius * Math.sin(t * n.userData.freq + n.userData.phase);
            let jitterY = n.userData.jitterRadius * Math.cos(t * (n.userData.freq * 1.1) + n.userData.phase);
            let jitterZ = n.userData.jitterRadius * Math.sin(t * (n.userData.freq * 0.9) - n.userData.phase);
            n.position.add(new THREE.Vector3(jitterX, jitterY, jitterZ));
        }
    });

    if (shaderFailed && !particleSystem.visible) {
        volumeMesh.visible = false;
        particleSystem.visible = true;
    }

    renderer.render(scene, camera);
}

// Init
updateUniforms();
animate();
