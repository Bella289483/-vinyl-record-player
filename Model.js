import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Model {
    constructor(obj) {
        this.name = obj.name;
        this.file = obj.url;
        this.scene = obj.scene;
        this.meshes = obj.meshes; 
        this.scale = obj.scale || new THREE.Vector3(1, 1, 1);
        this.position = obj.position || new THREE.Vector3(0, 0, 0);
        this.rotation = obj.rotation || new THREE.Vector3(0, 0, 0);
        this.callback = obj.callback; 
        this.loader = new GLTFLoader();
    }

    init() {
        this.loader.load(
            this.file,
            (gltf) => {
                const mesh = gltf.scene;
                
                // 应用传入的缩放、位置和旋转
                mesh.scale.copy(this.scale);
                mesh.position.copy(this.position);
                mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
                
                // 开启阴影
                mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // 添加到场景
                this.scene.add(mesh);
                
                // 存入 meshes 对象方便外部访问
                if (this.meshes) {
                    this.meshes[this.name] = mesh;
                }

                console.log(`✅ 模型 ${this.name} 加载完成`);

                // 执行回调
                if (this.callback) {
                    this.callback(mesh);
                }
            },
            (xhr) => {
                // 加载进度 (可选)
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error(` 模型 ${this.name} 加载失败:`, error);
            }
        );
    }
}