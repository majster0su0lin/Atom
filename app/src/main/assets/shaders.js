window.quantumMath = `
const float PI = 3.14159265359;

float factorial(int n) {
    float f = 1.0;
    for (int i = 2; i <= 10; i++) {
        if (i > n) break;
        f *= float(i);
    }
    return f;
}

float legendre(int l, int m, float x) {
    int am = abs(m);
    if (l == 0) return 1.0;
    if (l == 1) {
        if (am == 0) return x;
        if (am == 1) return -sqrt(1.0 - x*x);
    }
    if (l == 2) {
        if (am == 0) return 0.5 * (3.0*x*x - 1.0);
        if (am == 1) return -3.0 * x * sqrt(1.0 - x*x);
        if (am == 2) return 3.0 * (1.0 - x*x);
    }
    if (l == 3) {
        if (am == 0) return 0.5 * x * (5.0*x*x - 3.0);
        if (am == 1) return -1.5 * (5.0*x*x - 1.0) * sqrt(1.0 - x*x);
        if (am == 2) return 15.0 * x * (1.0 - x*x);
        if (am == 3) return -15.0 * pow(1.0 - x*x, 1.5);
    }
    if (l == 4) {
        if (am == 0) return 0.125 * (35.0*pow(x,4.0) - 30.0*x*x + 3.0);
        if (am == 1) return -2.5 * x * (7.0*x*x - 3.0) * sqrt(1.0 - x*x);
        if (am == 2) return 7.5 * (7.0*x*x - 1.0) * (1.0 - x*x);
        if (am == 3) return -105.0 * x * pow(1.0 - x*x, 1.5);
        if (am == 4) return 105.0 * pow(1.0 - x*x, 2.0);
    }
    return 0.0;
}

float sphericalHarmonic(int l, int m, float theta, float phi) {
    int am = abs(m);
    float N = sqrt( (2.0*float(l)+1.0)*factorial(l-am) / (4.0*PI*factorial(l+am)) );
    float P = legendre(l, m, cos(theta));
    if (m == 0) {
        return N * P;
    } else if (m > 0) {
        return sqrt(2.0) * N * P * cos(float(m) * phi);
    } else {
        return sqrt(2.0) * N * P * sin(float(am) * phi);
    }
}

float laguerre(int n, int l, float rho) {
    int p = n - l - 1;
    int alpha = 2 * l + 1;
    if (p == 0) return 1.0;
    if (p == 1) return float(alpha + 1) - rho;
    if (p == 2) return 0.5 * (float((alpha+1)*(alpha+2)) - 2.0*float(alpha+2)*rho + rho*rho);
    if (p == 3) return (1.0/6.0) * (float((alpha+1)*(alpha+2)*(alpha+3)) - 3.0*float((alpha+2)*(alpha+3))*rho + 3.0*float(alpha+3)*rho*rho - rho*rho*rho);
    if (p == 4) return (1.0/24.0) * (float((alpha+1)*(alpha+2)*(alpha+3)*(alpha+4)) - 4.0*float((alpha+2)*(alpha+3)*(alpha+4))*rho + 6.0*float((alpha+3)*(alpha+4))*rho*rho - 4.0*float(alpha+4)*rho*rho*rho + rho*rho*rho*rho);
    return 0.0;
}

float radial(int n, int l, float r, float Zeff) {
    float na0 = float(n);
    float rho = 2.0 * Zeff * r / na0;
    float exponent = exp(-rho / 2.0);
    float power = pow(rho, float(l));
    float lag = laguerre(n, l, rho);
    float norm = pow(Zeff / na0, 1.5); 
    return norm * power * exponent * lag;
}

vec2 getComplexPsiSingle(vec3 pos, int u_n, int u_l, int u_m, float u_e_field) {
    float r = length(pos);
    if (r < 0.001) return vec2(0.0); 
    float theta = acos(pos.y / r);
    float phi = atan(pos.z, pos.x);
    
    float R = radial(u_n, u_l, r, 1.0);
    float Y = sphericalHarmonic(u_l, u_m, theta, phi);
    float psi_real = R * Y;
    
    if (u_e_field > 0.0 && u_l < u_n - 1) {
        float R_mix = radial(u_n, u_l + 1, r, 1.0);
        float Y_mix = sphericalHarmonic(u_l + 1, u_m, theta, phi);
        psi_real += u_e_field * 0.5 * R_mix * Y_mix;
    }
    
    return vec2(psi_real, 0.0);
}

float getMultiElectronDensity(vec3 pos, float u_z) {
    float r = length(pos);
    if (r < 0.001) return 0.0;
    float theta = acos(pos.y / r);
    float phi = atan(pos.z, pos.x);
    
    float Z = u_z;
    float density = 0.0;
    
    if (Z >= 1.0) {
        float z1 = (Z == 1.0) ? 1.0 : Z - 0.3;
        float R1s = radial(1, 0, r, z1);
        float Y1s = sphericalHarmonic(0, 0, theta, phi);
        float psi = R1s * Y1s;
        density += (Z >= 2.0 ? 2.0 : 1.0) * psi * psi;
    }
    
    if (Z >= 3.0) {
        float num2 = clamp(Z - 2.0, 0.0, 8.0);
        float z2 = Z - 1.7 - 0.35*(num2 - 1.0);
        
        float n2s = min(num2, 2.0);
        float R2s = radial(2, 0, r, z2);
        float Y2s = sphericalHarmonic(0, 0, theta, phi);
        density += n2s * (R2s*Y2s)*(R2s*Y2s);
        
        if (num2 > 2.0) {
            float n2p = num2 - 2.0;
            float R2p = radial(2, 1, r, z2);
            float Y2p0 = sphericalHarmonic(1, 0, theta, phi);
            float Y2p1 = sphericalHarmonic(1, 1, theta, phi);
            float occ = n2p / 3.0;
            density += occ * (R2p*Y2p0)*(R2p*Y2p0);
            density += occ * (R2p*Y2p1)*(R2p*Y2p1) * 2.0;
        }
    }
    return density;
}

float getTDSEDensity(vec3 pos, float u_e_field, float u_time) {
    float r = length(pos);
    if (r < 0.001) return 0.0;
    float theta = acos(pos.y / r);
    float phi = atan(pos.z, pos.x);
    
    float R1 = radial(1, 0, r, 1.0);
    float Y1 = sphericalHarmonic(0, 0, theta, phi);
    float psi1 = R1 * Y1;
    
    float R2 = radial(2, 1, r, 1.0);
    float Y2 = sphericalHarmonic(1, 0, theta, phi);
    float psi2 = R2 * Y2;
    
    float Omega = u_e_field * 2.0 + 0.5;
    float c1 = cos(Omega * u_time);
    float c2 = sin(Omega * u_time);
    
    float dE_t = 10.0 * u_time;
    
    return c1*c1*psi1*psi1 + c2*c2*psi2*psi2 + 2.0*c1*c2*psi1*psi2*cos(dE_t);
}
`;

window.volumeVS = `
varying vec3 vPosition;
void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

window.volumeFS = `
precision highp float;

uniform int u_mode;
uniform int u_n;
uniform int u_l;
uniform int u_m;
uniform float u_z;
uniform float u_e_field;
uniform float u_b_field;
uniform float u_time;
uniform float u_density;
uniform float u_mu;
uniform vec3 u_cameraPos;
uniform vec2 u_resolution;

varying vec3 vPosition;

${window.quantumMath}

void main() {
    vec3 ro = u_cameraPos;
    vec3 rd = normalize(vPosition - ro);
    
    vec3 p;
    float t = 0.0;
    float stepSize = 0.3; 
    
    float posPhase = 0.0;
    float negPhase = 0.0;
    
    float scale = (u_mode == 0) ? (float(u_n) * float(u_n) * 1.5) : (u_mode == 1 ? 2.5 : 3.0);
    
    for(int i=0; i<60; i++) {
        p = vPosition + rd * t;
        float r = length(p);
        if(r > 15.0) break;
        
        vec3 sampleP = p / (scale * 0.15 + 0.5); 
        sampleP *= u_mu; // Reduced mass scaling
        
        if (u_mode == 0) {
            vec2 val = getComplexPsiSingle(sampleP, u_n, u_l, u_m, u_e_field);
            float density = val.x * val.x + val.y * val.y;
            if(val.x > 0.0) posPhase += density * stepSize;
            else negPhase += density * stepSize;
        } else if (u_mode == 1) {
            float density = getMultiElectronDensity(sampleP, u_z);
            posPhase += density * stepSize; 
        } else if (u_mode == 2) {
            float density = getTDSEDensity(sampleP, u_e_field, u_time);
            posPhase += density * stepSize * (0.5 + 0.5*sin(u_time * 10.0));
            negPhase += density * stepSize * (0.5 - 0.5*sin(u_time * 10.0));
        }
        
        t += stepSize;
    }
    
    vec3 colorPos = vec3(1.0, 0.2, 0.1);
    vec3 colorNeg = vec3(0.1, 0.6, 1.0);
    
    if (u_mode == 1) {
        colorPos = vec3(0.6, 0.8, 1.0);
        negPhase = 0.0;
    }
    
    float pP = pow(posPhase * u_density * 2.0, 0.8);
    float nP = pow(negPhase * u_density * 2.0, 0.8);
    vec3 finalColor = colorPos * pP + colorNeg * nP;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

window.particleVS = `
attribute float a_random;
varying float vAlpha;
varying vec3 vColor;

uniform int u_mode;
uniform int u_n;
uniform int u_l;
uniform int u_m;
uniform float u_z;
uniform float u_e_field;
uniform float u_time;
uniform float u_density;
uniform float u_mu;

${window.quantumMath}

void main() {
    vec3 p = position;
    float scale = (u_mode == 0) ? (float(u_n) * float(u_n) * 1.5) : (u_mode == 1 ? 2.5 : 3.0);
    vec3 sampleP = p / (scale * 0.15 + 0.5); 
    
    // Apply reduced mass scaling
    sampleP *= u_mu;

    float density = 0.0;
    float phase = 1.0;
    
    if (u_mode == 0) {
        vec2 val = getComplexPsiSingle(sampleP, u_n, u_l, u_m, u_e_field);
        density = val.x * val.x + val.y * val.y;
        phase = sign(val.x);
    } else if (u_mode == 1) {
        density = getMultiElectronDensity(sampleP, u_z);
        phase = 1.0;
    } else if (u_mode == 2) {
        density = getTDSEDensity(sampleP, u_e_field, u_time);
        phase = sin(u_time * 10.0) > 0.0 ? 1.0 : -1.0;
    }

    // Amplify density visually for particle system
    float visualDensity = density * u_density * 25.0;
    
    if (a_random > visualDensity) {
        vAlpha = 0.0; // Discard particle
    } else {
        vAlpha = clamp(visualDensity, 0.1, 0.7);
    }
    
    if (u_mode == 1) {
        vColor = vec3(0.6, 0.8, 1.0);
    } else {
        vColor = phase > 0.0 ? vec3(1.0, 0.2, 0.1) : vec3(0.1, 0.6, 1.0);
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (15.0 / -mvPosition.z); 
    gl_Position = projectionMatrix * mvPosition;
}
`;

window.particleFS = `
varying float vAlpha;
varying vec3 vColor;
void main() {
    if (vAlpha <= 0.0) discard;
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;
    
    float alpha = vAlpha * (1.0 - 2.0*length(coord));
    gl_FragColor = vec4(vColor, alpha);
}
`;

window.nucleusVS = `
varying vec3 vPosition;
void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

window.nucleusFS = `
precision highp float;
varying vec3 vPosition;
uniform float u_mu;
uniform float u_z;
uniform float u_time;

void main() {
    float r = length(vPosition);
    
    // Gaussian spread related to reduced mass. 
    // We scale it so it's visually distinct but conceptually tied to mu.
    float sigma = 0.4 / max(pow(u_mu, 0.25), 0.5); 
    
    // Quantum zero-point oscillation (breathing mode)
    sigma += 0.05 * sin(u_time * 8.0);
    
    float density = exp(-(r*r) / (2.0 * sigma * sigma));
    if (density < 0.01) discard;
    
    // Color transitions from Hydrogen (reddish) to heavier nuclei (bluish-white)
    vec3 colorH = vec3(1.0, 0.3, 0.3);
    vec3 colorHeavy = vec3(0.5, 0.7, 1.0);
    vec3 baseColor = mix(colorH, colorHeavy, clamp((u_z - 1.0) / 9.0, 0.0, 1.0));
    
    gl_FragColor = vec4(baseColor * density * 2.0, density);
}
`;
