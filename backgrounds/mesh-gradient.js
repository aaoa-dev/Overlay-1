import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { TwitchService } from '../src/services/TwitchService.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

// Configuration
const CONFIG = {
    colorCount: 6,
    baseColors: [
        '#050505', // Deep Black
        '#121212', // Very Dark
        '#1e1e1e', // Dark
        '#2a2a2a', // Mid Dark
        '#383838', // Mid Gray
        '#4a4a4a'  // Lightest Gray
    ],
    animationSpeed: 0.1,   // Slower, more calming motion
    transitionSpeed: 0.02, // Slower for softer transitions
    revertDelay: 15000     // 15 seconds before reverting to base color
};

class MeshGradient {
    constructor() {
        this.canvas = document.getElementById('mesh-canvas');
        this.statusEl = document.getElementById('status');
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });

        // Initialize colors
        this.baseColors = CONFIG.baseColors.map(c => new THREE.Color(c));
        this.colors = CONFIG.baseColors.map(c => new THREE.Color(c));
        this.targetColors = CONFIG.baseColors.map(c => new THREE.Color(c));
        this.chatterColors = CONFIG.baseColors.map(c => new THREE.Color(c)); // Store original chatter color
        
        // Track when each slot was last updated by a user
        this.lastUpdated = new Array(CONFIG.colorCount).fill(0);
        this.currentColorIndex = 0;

        this.init();
        this.setupTwitch();
        this.animate();

        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }

    init() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        this.uniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2() },
            uColors: { value: this.colors },
            uSpeed: { value: CONFIG.animationSpeed }
        };

        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec3 uColors[6];
            uniform float uSpeed;
            varying vec2 vUv;

            // Simple noise function
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                    + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.w) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 a0 = x - floor(x + 0.5);
                vec3 g = a0 * vec3(x0.x, x12.xz) + h * vec3(x0.y, x12.yw);
                vec3 l = 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 diff = g * l;
                float res = 130.0 * dot(m, diff);
                return res;
            }

            void main() {
                vec2 uv = vUv;
                float t = uTime * uSpeed;
                
                // Reduced frequency for less turbulence
                float n1 = snoise(uv * 0.8 + t * 0.4);
                float n2 = snoise(uv * 1.0 - t * 0.2 + n1 * 0.3);
                
                // Reduced warping strength
                vec2 warpedUv = uv + vec2(n1, n2) * 0.12;
                
                // Calculate influence of each color point
                vec3 finalColor = vec3(0.0);
                float totalWeight = 0.0;
                
                for(int i = 0; i < 6; i++) {
                    float it = float(i);
                    // Move points around
                    vec2 point = vec2(
                        0.5 + 0.4 * sin(t * (0.5 + it * 0.1) + it),
                        0.5 + 0.4 * cos(t * (0.4 + it * 0.1) + it * 1.5)
                    );
                    
                    float dist = distance(warpedUv, point);
                    // Adjusted falloff for better visibility while maintaining contrast
                    float weight = 1.0 / pow(dist + 0.45, 4.5); 
                    
                    finalColor += uColors[i] * weight;
                    totalWeight += weight;
                }
                
                finalColor /= totalWeight;
                
                // Add some subtle grain
                float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
                finalColor += (grain - 0.5) * 0.04;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader,
            fragmentShader
        });

        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        this.uniforms.uResolution.value.set(width, height);
    }

    async setupTwitch() {
        try {
            this.twitch = new TwitchService();
            await this.twitch.initialize();
            
            this.messageHandler = new MessageHandler(this.twitch);
            
            // Listen for any message to get user color
            this.messageHandler.registerHandler('background_color_reaction', (channel, tags, message) => {
                let userColor = tags.color;
                
                // If user doesn't have a color, generate one from username
                if (!userColor) {
                    const hash = Array.from(tags.username || 'unknown').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    userColor = `hsl(${hash % 360}, 70%, 60%)`;
                }
                
                this.updateTargetColor(userColor);
            });

            this.messageHandler.start();
            this.statusEl.textContent = `Live on ${this.twitch.getChannel()}`;
            setTimeout(() => this.statusEl.style.opacity = '0', 3000);
        } catch (error) {
            ErrorHandler.handle(error, 'twitch_init');
            this.statusEl.textContent = 'Connection Error';
        }
    }

    updateTargetColor(hexColor) {
        const color = new THREE.Color(hexColor);
        
        // Store the peak color and reset the timer
        this.chatterColors[this.currentColorIndex].copy(color);
        this.targetColors[this.currentColorIndex].copy(color);
        this.lastUpdated[this.currentColorIndex] = Date.now();
        
        // Move to next index for next chatter
        this.currentColorIndex = (this.currentColorIndex + 1) % CONFIG.colorCount;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const now = Date.now();
        this.uniforms.uTime.value += 0.01;

        // Smoothly interpolate current colors towards target colors
        for (let i = 0; i < CONFIG.colorCount; i++) {
            // If this slot was recently updated by a chatter
            if (this.lastUpdated[i] > 0) {
                const elapsed = now - this.lastUpdated[i];
                const progress = Math.min(elapsed / CONFIG.revertDelay, 1.0);
                
                // Immediately start moving the target back to base color based on progress
                this.targetColors[i].copy(this.chatterColors[i]).lerp(this.baseColors[i], progress);
                
                // Once we reach 100% fade, mark as inactive
                if (progress >= 1.0) {
                    this.lastUpdated[i] = 0;
                }
            }

            this.colors[i].lerp(this.targetColors[i], CONFIG.transitionSpeed);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

new MeshGradient();

