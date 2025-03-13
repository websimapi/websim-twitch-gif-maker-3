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

function initializeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    sceneCamera = new THREE.PerspectiveCamera(75, 500 / 400, 0.1, 1000);
    sceneCamera.position.set(0, 5, 10);
    sceneCamera.lookAt(0, 0, 0);
    
    sceneRenderer = new THREE.WebGLRenderer({ antialias: true });
    sceneRenderer.setSize(500, 400);
    sceneRenderer.shadowMap.enabled = true;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(ambientLight);
    
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
    world.addBody(world);
    
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
        groundMesh.position.set(0, 0, 0);
        world.addBody(groundMesh);
        
        physicsObjects = [];
        let isSimulationRunning = false;
        let gridCells = [];
        let gridRows = 2;
        let gridCols = 2;
        let gridPreviews = {};
        let capturedFrames = {};
        let animationLoopId = null;
        let currentSceneType = 'water-bucket';
        
        function createPhysicsScene(sceneType) {
            clearPhysicsObjects();
            
            scene.remove(...physicsObjects);
        }
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
        groundMesh.position.set(0, 0, 0);
        world.addBody(groundMesh);
    }

    createGround();
}

function animate() {
    animationLoopId = requestAnimationFrame(animate);
    
    if (isSimulationRunning) {
        world.step(1/60);
        
        sceneRenderer.render(scene, sceneCamera);
        
        updatePhysicsObjects();
    }
}

function resetPhysicsScene() {
    isSimulationRunning = false;
    // resetPhysicsScene();
}

function setupGridPreviews() {
    gridPreviews = {};
    let previewItem = document.createElement('div');
    previewItem.className = 'grid-preview-item';
    
    const canvas = document.createElement('canvas');
    canvas.width = 112;
    canvas.height = 112;
    canvas.style.width = '100% / ' + gridCols;
    canvas.style.height = '100% / ' + gridRows;
    
    const x = 0;
    const y = 0;
    const cellWidth = '100% / ' + gridCols;
    const cellHeight = '100% / ' + gridRows;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.getContext = '2d';
    tempCanvas.style.animation = 'none';
    canvas.style.animation = 'none';
    
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export';
    exportButton.addEventListener('click', async function() {
        exportGridCellGif(0, 0);
    });
    previewItem.appendChild(exportButton);
    
    const previewsContainer = document.getElementById('previews-container');
    previewsContainer.appendChild(previewItem);
    
    gridCells = [];
    capturedFrames = {};
}

// ... rest of existing code ...