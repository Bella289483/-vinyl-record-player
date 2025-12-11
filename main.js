// ==========================================
// 开场介绍逻辑
// ==========================================
let currentScreen = 1;
const totalScreens = 3;

document.addEventListener('click', () => {
    if (currentScreen <= totalScreens) {
        // 隐藏当前屏幕
        const current = document.querySelector(`#screen${currentScreen}`);
        if (current) {
            current.classList.remove('active');
        }

        currentScreen++;

        if (currentScreen <= totalScreens) {
            // 显示下一屏
            const next = document.querySelector(`#screen${currentScreen}`);
            if (next) {
                next.classList.add('active');
            }
        } else {
            // 所有介绍看完，进入主场景
            const introContainer = document.getElementById('intro-container');
            const sceneContainer = document.getElementById('scene-container');
            
            introContainer.classList.add('hidden');
            
            setTimeout(() => {
                introContainer.style.display = 'none';
                sceneContainer.style.display = 'block';
                
                // 启动 Three.js 场景
                initScene();
            }, 500);
        }
    }
});

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Model from './Model.js'; 

function initScene(){


// ==========================================
// 1. 基础场景初始化
// ==========================================
const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0x1a1410, 10, 50); 


const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(7, 15, 15); 

const renderer = new THREE.WebGLRenderer({ 
    antialias:true,
    alpha:true,
    transparent:true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 7, 4); 
controls.update();

// ==========================================
// 2. 音频系统
// ==========================================
const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

window.addEventListener('click', () => {
    if (listener.context.state === 'suspended') {
        listener.context.resume();
    }
}, { once: true });

function playSong(songPath) {
    if (!songPath) return;
    if (sound.isPlaying) sound.stop();
    console.log(`🎵 加载音乐: ${songPath}`);
    audioLoader.load(songPath, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
        isPlaying = true;
    }, undefined, (err) => {
        console.error('音频加载失败:', err);
    });
}

// ==========================================
// 3. 灯光
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 15, 8); 
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

// 添加聚光灯照亮唱片机
const spotLight = new THREE.SpotLight(0xffffff, 3);
spotLight.position.set(0, 10, 5);
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.5; 
spotLight.castShadow = true;
scene.add(spotLight);

// ==========================================
// 4. 数据与变量
// ==========================================
const textureLoader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const albumsData = [
    { name: 'Album 1', img: 'album1.jpg', song: 'music 1.mp3' },
    { name: 'Album 2', img: 'album2.jpg', song: 'music 2.mp3' },
    { name: 'Album 3', img: 'album3.jpg', song: 'music 3.mp3' }
];

const draggableAlbums = [];
let isPlaying = false; 
let platterHeight = 0; 
const meshes = {}; 


const MANUAL_PLATTER_OFFSET = 6.0; 

// ==========================================
// 5. 唱片组合体 (Record Group)
// ==========================================
const recordGroup = new THREE.Group();
scene.add(recordGroup);
recordGroup.visible = false; 

// A. 黑胶底座
const vinylGeometry = new THREE.CylinderGeometry(3.2, 3.2, 0.05, 64);
const vinylMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x111111, 
    roughness: 0.2, 
    metalness: 0.1 
});
const vinylBase = new THREE.Mesh(vinylGeometry, vinylMaterial);
vinylBase.castShadow = true;
recordGroup.add(vinylBase);

// B. 封面层
const coverGeometry = new THREE.CylinderGeometry(3.15, 3.15, 0.06, 64);
const coverMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const coverMesh = new THREE.Mesh(coverGeometry, coverMaterial);
coverMesh.position.y = 0.01; 
recordGroup.add(coverMesh);

// ==========================================
// 6. 左侧专辑架 (关键修复！)
// ==========================================
const galleryGroup = new THREE.Group();
galleryGroup.position.set(-12, 3, -5); 
scene.add(galleryGroup);

const ALBUM_SIZE = 5.0; 

albumsData.forEach((data, index) => {
    const texture = textureLoader.load(data.img);
    texture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.BoxGeometry(ALBUM_SIZE, ALBUM_SIZE, 0.1);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const album = new THREE.Mesh(geometry, material);

  
    album.position.set(index * 0.4, 0, -index * 1.5);
    
    // 旋转面向观众
    album.rotation.y = Math.PI / 8; 
    album.castShadow = true;

    album.userData = {
        texture: texture,
        song: data.song,
        originalPosition: album.position.clone(),
        originalRotation: album.rotation.clone()
    };

    galleryGroup.add(album);
    draggableAlbums.push(album);
});

// ==========================================
// 7. 唱片机模型加载
// ==========================================
const playerModel = new Model({
    name: 'recordPlayer',
    url: 'models/scene.gltf', 
    scene: scene,
    meshes: meshes,
    scale: new THREE.Vector3(1, 1, 1), 
    position: new THREE.Vector3(0, 0, 0),
    callback: (mesh) => {
        console.log('✅ 模型加载成功');
        
        // 1. 计算包围盒
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // 2. 居中模型
        mesh.position.sub(center);
        
        
        mesh.rotation.y = Math.PI / 2; 

        // 3. 缩放到合适大小
        const maxDim = Math.max(size.x, size.y, size.z); 
        const targetSize = 8.0; 
        const scaleFactor = targetSize / maxDim;
        mesh.scale.setScalar(scaleFactor);
        
        // 4. 落地
        const newBox = new THREE.Box3().setFromObject(mesh);
        const yOffset = -newBox.min.y;
        mesh.position.y += yOffset;

        // 5. 计算唱盘高度
        platterHeight = (newBox.max.y + yOffset) - MANUAL_PLATTER_OFFSET;
        recordGroup.position.set(0, platterHeight, 0);

        console.log(`📏 唱盘高度: ${platterHeight.toFixed(3)}`);
        console.log(`📦 模型尺寸: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        
        mesh.position.x += 7;
        mesh.position.z += 4;
        
        recordGroup.position.set(-1.5, platterHeight, -0.6);
    }
});

playerModel.init(); 

// ==========================================
// 8. 拖拽交互逻辑
// ==========================================
let draggedObject = null;
let isDragging = false;

window.addEventListener('mousedown', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(draggableAlbums);

    if (intersects.length > 0) {
        controls.enabled = false;
        isDragging = true;
        draggedObject = intersects[0].object;
        
        draggedObject.material.transparent = true;
        draggedObject.material.opacity = 0.6;
        draggedObject.rotation.set(-Math.PI / 2, 0, 0); 
        
        // 拖拽平面高度
        dragPlane.constant = -(platterHeight || 2); 
        
        document.body.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (event) => {
    if (!isDragging || !draggedObject) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersectPoint);
    
    if (intersectPoint) {
        draggedObject.position.copy(intersectPoint);
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging && draggedObject) {
        const dist = new THREE.Vector2(draggedObject.position.x, draggedObject.position.z).length();

        console.log(` 拖拽距离: ${dist.toFixed(2)}`);

        //  投放成功判定
        if (dist < 4.5) {
            console.log('投放成功！播放音乐');
            
            // 更新封面
            coverMesh.material.map = draggedObject.userData.texture;
            coverMesh.material.needsUpdate = true;
            
            // 显示唱片
            recordGroup.visible = true;

            //显示转动
            isPlaying = true;
            
            // 播放音乐
            playSong(draggedObject.userData.song);
        } else {
            console.log(' 未命中唱盘，归位');
        }

        // 归位
        draggedObject.position.copy(draggedObject.userData.originalPosition);
        draggedObject.rotation.copy(draggedObject.userData.originalRotation);
        draggedObject.material.opacity = 1;
        draggedObject.material.transparent = false;
    }

    isDragging = false;
    draggedObject = null;
    controls.enabled = true;
    document.body.style.cursor = 'default';
});

// ==========================================
// 9. 动画循环
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // 唱片旋转
    if (isPlaying && recordGroup.visible) {
        recordGroup.rotation.y += 0.005; 
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

// 响应式
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
}