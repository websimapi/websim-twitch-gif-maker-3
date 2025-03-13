// ... existing code ...

// 3D Scene Variables
let sceneRenderer, sceneCamera, scene, world;
let physicsObjects = [];
let isSimulationRunning = false;
let gridCells = [];
let gridRows = 2;
let gridCols = 2;
let gridPreviews = {};
let capturedFrames = {};
let animationLoopId = null;
let currentSceneType = 'water-bucket';

// Initialize 3D scene on load
document.addEventListener('DOMContentLoaded', function() {
    initializeScene();
    setupSceneControls();
});

function initializeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    sceneCamera = new THREE.PerspectiveCamera(75, 500 / 400, 0.1, 1000);
    sceneCamera.position.set(0, 5, 10);
    sceneCamera.lookAt(0, 0, 0);
    
    sceneRenderer = new THREE.WebGLRenderer({ antialias: true });
    sceneRenderer.setSize(500, 400);
    sceneRenderer.shadowMap.enabled = true;
    
    const container = document.getElementById('scene-container');
    container.innerHTML = '';
    container.appendChild(sceneRenderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
    createGround();
    
    createPhysicsScene(currentSceneType);
    
    createGridOverlay();
    
    animate();
}

function animate() {
    animationLoopId = requestAnimationFrame(animate);
    
    if (isSimulationRunning) {
        world.step(1/60);
        
        updatePhysicsObjects();
    }
    
    sceneRenderer.render(scene, sceneCamera);
    
    updateGridPreviews();
}

function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    
    const groundBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
}

function createPhysicsScene(sceneType) {
    clearPhysicsObjects();
    
    switch(sceneType) {
        case 'water-bucket':
            createWaterBucketScene();
            break;
        case 'falling-blocks':
            createFallingBlocksScene();
            break;
        case 'bouncing-ball':
            createBouncingBallScene();
            break;
    }
}

function createWaterBucketScene() {
    const bucketRadius = 2;
    const bucketHeight = 3;
    
    const bucketGeometry = new THREE.CylinderGeometry(bucketRadius, bucketRadius, bucketHeight, 32);
    const bucketMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8
    });
    const bucketMesh = new THREE.Mesh(bucketGeometry, bucketMaterial);
    bucketMesh.position.set(0, bucketHeight/2, 0);
    bucketMesh.castShadow = true;
    bucketMesh.receiveShadow = true;
    scene.add(bucketMesh);
    
    const bucketBodyBottom = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Cylinder(bucketRadius, bucketRadius, 0.1, 32),
        position: new CANNON.Vec3(0, 0.05, 0)
    });
    world.addBody(bucketBodyBottom);
    
    const segments = 16;
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = bucketRadius * Math.cos(angle1);
        const z1 = bucketRadius * Math.sin(angle1);
        const x2 = bucketRadius * Math.cos(angle2);
        const z2 = bucketRadius * Math.sin(angle2);
        
        const wallShape = new CANNON.Box(new CANNON.Vec3(0.05, bucketHeight/2, bucketRadius * Math.sin(Math.PI/segments)));
        const wallBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: wallShape
        });
        
        const midAngle = (angle1 + angle2) / 2;
        const midX = bucketRadius * Math.cos(midAngle);
        const midZ = bucketRadius * Math.sin(midAngle);
        
        wallBody.position.set(midX, bucketHeight/2, midZ);
        wallBody.quaternion.setFromEuler(0, midAngle, 0);
        
        world.addBody(wallBody);
    }
    
    for (let i = 0; i < 100; i++) {
        const radius = 0.1;
        const dropGeometry = new THREE.SphereGeometry(radius, 16, 16);
        const dropMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.8
        });
        const dropMesh = new THREE.Mesh(dropGeometry, dropMaterial);
        
        const angle = Math.random() * Math.PI * 2;
        const radialDist = Math.random() * (bucketRadius - radius);
        dropMesh.position.set(
            radialDist * Math.cos(angle),
            bucketHeight - 0.5 - Math.random() * 0.5,
            radialDist * Math.sin(angle)
        );
        
        dropMesh.castShadow = true;
        scene.add(dropMesh);
        
        const dropBody = new CANNON.Body({
            mass: 0.1,
            shape: new CANNON.Sphere(radius),
            position: new CANNON.Vec3(dropMesh.position.x, dropMesh.position.y, dropMesh.position.z),
            material: new CANNON.Material({ restitution: 0.3, friction: 0.1 })
        });
        world.addBody(dropBody);
        
        physicsObjects.push({
            mesh: dropMesh,
            body: dropBody,
            initialPosition: dropBody.position.clone(),
            initialVelocity: new CANNON.Vec3(0, 0, 0)
        });
    }
}

function createFallingBlocksScene() {
    const platformGeometry = new THREE.BoxGeometry(6, 0.5, 6);
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
    platformMesh.position.set(0, 3, 0);
    platformMesh.receiveShadow = true;
    scene.add(platformMesh);
    
    const platformBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(3, 0.25, 3)),
        position: new CANNON.Vec3(0, 3, 0)
    });
    world.addBody(platformBody);
    
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    
    for (let i = 0; i < 20; i++) {
        const size = 0.3 + Math.random() * 0.3;
        const blockGeometry = new THREE.BoxGeometry(size, size, size);
        const blockMaterial = new THREE.MeshStandardMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
        });
        const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
        
        const x = -2 + Math.random() * 4;
        const z = -2 + Math.random() * 4;
        const y = 4 + i * 0.4;
        
        blockMesh.position.set(x, y, z);
        blockMesh.castShadow = true;
        scene.add(blockMesh);
        
        const blockBody = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2)),
            position: new CANNON.Vec3(x, y, z),
            material: new CANNON.Material({ restitution: 0.3, friction: 0.5 })
        });
        world.addBody(blockBody);
        
        physicsObjects.push({
            mesh: blockMesh,
            body: blockBody,
            initialPosition: blockBody.position.clone(),
            initialVelocity: new CANNON.Vec3(0, 0, 0)
        });
    }
}

function createBouncingBallScene() {
    const rampGeometry = new THREE.BoxGeometry(6, 0.5, 6);
    const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);
    rampMesh.position.set(0, 1, 0);
    rampMesh.rotation.x = -Math.PI / 12; 
    rampMesh.receiveShadow = true;
    scene.add(rampMesh);
    
    const rampBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(3, 0.25, 3)),
        position: new CANNON.Vec3(0, 1, 0)
    });
    rampBody.quaternion.setFromEuler(-Math.PI / 12, 0, 0);
    world.addBody(rampBody);
    
    const radius = 0.5;
    const ballGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
    });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.position.set(0, 5, -3);
    ballMesh.castShadow = true;
    scene.add(ballMesh);
    
    const ballBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(0, 5, -3),
        material: new CANNON.Material({ restitution: 0.8, friction: 0.3 })
    });
    ballBody.velocity.set(0, 0, 5);
    world.addBody(ballBody);
    
    physicsObjects.push({
        mesh: ballMesh,
        body: ballBody,
        initialPosition: ballBody.position.clone(),
        initialVelocity: new CANNON.Vec3(0, 0, 5)
    });
}

function clearPhysicsObjects() {
    physicsObjects.forEach(obj => {
        world.removeBody(obj.body);
        scene.remove(obj.mesh);
    });
    
    physicsObjects = [];
}

function updatePhysicsObjects() {
    physicsObjects.forEach(obj => {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    });
}

function resetPhysicsScene() {
    physicsObjects.forEach(obj => {
        obj.body.position.copy(obj.initialPosition);
        obj.body.velocity.copy(obj.initialVelocity);
        obj.body.angularVelocity.set(0, 0, 0);
        obj.body.quaternion.set(0, 0, 0, 1);
    });
}

function createGridOverlay() {
    const gridOverlay = document.getElementById('grid-overlay');
    gridOverlay.innerHTML = '';
    gridCells = [];
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.width = `${100 / gridCols}%`;
            cell.style.height = `${100 / gridRows}%`;
            cell.style.left = `${col * (100 / gridCols)}%`;
            cell.style.top = `${row * (100 / gridRows)}%`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            cell.addEventListener('click', () => {
                cell.classList.toggle('selected');
            });
            
            gridOverlay.appendChild(cell);
            gridCells.push(cell);
        }
    }
}

function setupSceneControls() {
    document.getElementById('apply-grid').addEventListener('click', () => {
        gridRows = parseInt(document.getElementById('grid-rows').value);
        gridCols = parseInt(document.getElementById('grid-cols').value);
        createGridOverlay();
        setupGridPreviews();
    });
    
    document.getElementById('run-physics').addEventListener('click', () => {
        isSimulationRunning = true;
    });
    
    document.getElementById('stop-physics').addEventListener('click', () => {
        isSimulationRunning = false;
    });
    
    document.getElementById('reset-physics').addEventListener('click', () => {
        isSimulationRunning = false;
        resetPhysicsScene();
    });
    
    document.getElementById('capture-grid').addEventListener('click', () => {
        captureGridRegions();
    });
    
    document.getElementById('scene-type').addEventListener('change', (e) => {
        currentSceneType = e.target.value;
        isSimulationRunning = false;
        createPhysicsScene(currentSceneType);
    });
    
    setupGridPreviews();
}

function setupGridPreviews() {
    const previewsContainer = document.getElementById('grid-previews');
    previewsContainer.innerHTML = '';
    gridPreviews = {};
    capturedFrames = {};
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const previewItem = document.createElement('div');
            previewItem.className = 'grid-preview-item';
            
            const canvas = document.createElement('canvas');
            canvas.width = 112;
            canvas.height = 112;
            previewItem.appendChild(canvas);
            
            const label = document.createElement('div');
            label.className = 'grid-preview-label';
            label.textContent = `Cell ${row+1},${col+1}`;
            previewItem.appendChild(label);
            
            const exportButton = document.createElement('button');
            exportButton.textContent = 'Export';
            exportButton.addEventListener('click', () => {
                exportGridCellGif(row, col);
            });
            previewItem.appendChild(exportButton);
            
            previewsContainer.appendChild(previewItem);
            
            const ctx = canvas.getContext('2d');
            gridPreviews[`${row},${col}`] = {
                canvas: canvas,
                ctx: ctx,
                frames: []
            };
            capturedFrames[`${row},${col}`] = [];
        }
    }
}

function updateGridPreviews() {
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const preview = gridPreviews[`${row},${col}`];
            if (preview) {
                const width = sceneRenderer.domElement.width;
                const height = sceneRenderer.domElement.height;
                const cellWidth = width / gridCols;
                const cellHeight = height / gridRows;
                const x = col * cellWidth;
                const y = row * cellHeight;
                
                preview.ctx.drawImage(
                    sceneRenderer.domElement,
                    x, y, cellWidth, cellHeight,
                    0, 0, preview.canvas.width, preview.canvas.height
                );
            }
        }
    }
}

function captureGridRegions() {
    const selectedCells = document.querySelectorAll('.grid-cell.selected');
    if (selectedCells.length === 0) {
        alert('Please select at least one grid cell to capture.');
        return;
    }
    
    isSimulationRunning = false;
    resetPhysicsScene();
    
    selectedCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        capturedFrames[`${row},${col}`] = [];
    });
    
    alert('Recording started. The simulation will run for 3 seconds.');
    
    isSimulationRunning = true;
    
    let frameCount = 0;
    const totalFrames = 180;
    
    function captureFrame() {
        if (frameCount >= totalFrames) {
            isSimulationRunning = false;
            alert('Recording complete! You can now export the GIFs.');
            return;
        }
        
        selectedCells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            const width = sceneRenderer.domElement.width;
            const height = sceneRenderer.domElement.height;
            const cellWidth = width / gridCols;
            const cellHeight = height / gridRows;
            const x = col * cellWidth;
            const y = row * cellHeight;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 112;
            tempCanvas.height = 112;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.drawImage(
                sceneRenderer.domElement,
                x, y, cellWidth, cellHeight,
                0, 0, tempCanvas.width, tempCanvas.height
            );
            
            capturedFrames[`${row},${col}`].push(tempCanvas.toDataURL());
        });
        
        frameCount++;
        requestAnimationFrame(captureFrame);
    }
    
    captureFrame();
}

function exportGridCellGif(row, col) {
    const frames = capturedFrames[`${row},${col}`];
    
    if (!frames || frames.length === 0) {
        alert('No frames have been captured for this cell yet. Please record first.');
        return;
    }
    
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 112,
        height: 112,
        workerScript: URL.createObjectURL(gifWorkerBlob)
    });
    
    const loadNextFrame = (index) => {
        if (index >= frames.length) {
            gif.on('finished', (blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `grid-cell-${row+1}-${col+1}.gif`;
                link.click();
                
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
            });
            
            gif.render();
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            gif.addFrame(img, { delay: 1000 / 30 }); 
            loadNextFrame(index + 1);
        };
        img.src = frames[index];
    };
    
    loadNextFrame(0);
}

function generateAnimationCSS(animationType) {
    // ... existing code ...
}

function updateLivePreview() {
    // ... existing code ...
}

async function generateAccuratePreview(previewCanvas, settings) {
    // ... existing code ...
}

document.getElementById('generateGif').onclick = async function() {
    // ... existing code ...
};

document.getElementById('clearCanvas').addEventListener('click', () => {
    frames = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('fileInput').value = '';
    selectedAnimation = 'none';
    document.querySelectorAll('.animation-option').forEach(opt => {
        if (opt.dataset.animation !== 'rainbow-effect') {
            opt.classList.remove('selected');
        }
    });
    document.querySelector('[data-animation="none"]').classList.add('selected');
    
    const previewCanvas = document.getElementById('previewAnimation');
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCanvas.style.animation = 'none';
});

// AI Image Generation
document.getElementById('generateImage').addEventListener('click', async () => {
    // ... existing code ...
});