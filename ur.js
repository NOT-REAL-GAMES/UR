import * as glm from './src/glm/index.js';

var canvas;
var adapter;
var device;

var queue;

var context;

var pipeline;

var colorTex;
var colorTexView;

var depthTex;
var depthTexView;

var models = [];
var modelsMeta = [];

var gameObjects = [];

var encoder;

var bindGroup;

var transformBuffer;
var bindGroupLayout;

var renderPassDesc;

var projectionMatrix = glm.mat4.create();


var url = window.location.href;

async function init(){
	canvas = document.querySelector("#ur");
	adapter = await navigator.gpu.requestAdapter();
	device = await adapter.requestDevice({
		extensions: adapter.extensions
	});

	queue = device.queue;
	context = canvas.getContext("webgpu");

	const ratio = window.devicePixelRatio || 1;
	const presentSize = [
		canvas.clientWidth * ratio, 
		canvas.clientHeight * ratio
	];

	const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
	
	context.configure({ 
		device: device, 
		format: canvasFormat, 
		size: presentSize,
		usage: 
			GPUTextureUsage.RENDER_ATTACHMENT |
			GPUTextureUsage.COPY_SRC,
		alphaMode: 'opaque'
	});

	glm.mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, canvas.clientWidth/canvas.clientHeight, 0.01, 10000.0);

}

function transform(pos,rot){
	var vec = new Array(Math.floor(pos.length/3));
	for(var i = 0; i<pos.length;i+=3){
		vec[Math.floor(i/3)] = glm.vec3.fromValues(pos[i],pos[i+1],pos[i+2]);
		glm.vec3.transformMat4(vec[Math.floor(i/3)],vec[Math.floor(i/3)],rot);
	}
	
	var arr = new Array(pos.length);
	for(var i=0; i<arr.length;i+=3){
		arr[i] = vec[Math.floor(i/3)][0];
		arr[i+1] = vec[Math.floor(i/3)][1];
		arr[i+2] = vec[Math.floor(i/3)][2];
	}
	//console.log(arr);
	return arr;
}

async function createPipeline(){	
	const depthTexDesc = {
		size: [canvas.width, canvas.height, 1],
		dimension: '2d',
		format: 'depth24plus-stencil8',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
	};

	depthTex = device.createTexture(depthTexDesc);
	depthTexView = depthTex.createView();

	var frag; var vert;

	await fetch('./src/default.vert').then((response) => response.text()).then((shader) => {vert = shader;});	
	await fetch('./src/default.frag').then((response) => response.text()).then((shader) => {frag = shader;});	

	const vModule = device.createShaderModule({code:vert});
	const fModule = device.createShaderModule({code:frag});

	const posBufDesc = {
		attributes: [{
			shaderLocation: 0,
			offset: 0,
			format: 'float32x3'
		}],
		arrayStride: 4*3,
		stepMode: 'vertex'
	};

	const colBufDesc = {
		attributes: [{
			shaderLocation: 1,
			offset: 0,
			format: 'float32x3'
		}],
		arrayStride: 4*3,
		stepMode: 'vertex'
	};

	const transformBufferBindGroupLayoutEntry = {
        binding: 0, // @group(0) @binding(0)
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
    };
    const bindGroupLayoutDescriptor = { entries: [transformBufferBindGroupLayoutEntry] };
    bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);


	const pipelineLayoutDesc = {bindGroupLayouts: [bindGroupLayout]};
	const layout = device.createPipelineLayout(pipelineLayoutDesc);

	const colorState = {format: 'bgra8unorm'};
	const pipelineDesc = {
		layout: layout,
		vertex: {
			module: vModule,
			entryPoint: 'main',
			buffers: [posBufDesc,colBufDesc]
		},
		fragment: {
			module: fModule,
			entryPoint: 'main',
			targets: [colorState]
		},
		primitive: {
			frontFace: 'cw',
			cullMode: 'none',
			topology: 'triangle-list'
		},
		depthStencil: {
			depthWriteEnabled: true,
			depthCompare: 'less',
			format: 'depth24plus-stencil8'
		}
	};

	pipeline = device.createRenderPipeline(pipelineDesc);
}

async function createBuffer(array,usage){
	//console.log((array.length* + 4) & ~3);
	let mult = usage == GPUBufferUsage.VERTEX ?
		4 : 4;
	let desc = {
		size: (array.length*mult) & ~3,
		usage,
		mappedAtCreation: true
	};
	let buffer = await device.createBuffer(desc);
	//TODO: write switch case for every possible usage.
	let bla = (buffer.getMappedRange());
	//console.log(bla);
	const writeArray =
		usage == GPUBufferUsage.VERTEX
		? new Float32Array(bla)
		: new Uint16Array(bla);
	writeArray.set(array,0);
	buffer.unmap();
	return buffer;
}

var scene;

async function initializeScene(){
	
	await fetch('./src/test.scene').then((response) => response.json()).then((json) => {scene = json;});	

	console.log(scene.gameObjects);

	for(var i = 0;i<scene.gameObjects.length;++i){
		if(scene.gameObjects[i].components.renderer!=null){
			var model;
			console.log("model found");
			await fetch(
				scene.gameObjects[i].components.renderer.modelSource
			).then((response) => response.json()).then((json) => {model = json;});	
			gameObjects.push(scene.gameObjects[i]);
			models.push({
				pos: model.positions,
				col: model.colors,
				idx: model.indices
			})
		}
	}

	//await fetch('./src/cube.json').then((response) => response.json()).then((json) => {mdl = json;});	
	//await fetch('./src/floor.json').then((response) => response.json()).then((json) => {mdl2 = json;});	

}

async function ur(){
	if (!navigator.gpu) {return;}

	await init();


	await initializeScene();


	await createPipeline();

	render();
}

async function updatePositionBuffers(){

	var rotation = glm.mat4.create();
	glm.mat4.fromRotation(rotation,0.01,glm.vec3.fromValues(1,1,0));
	models[0].pos = transform(models[0].pos,rotation);

	for(var i = 0;i<models.length;++i){
		
		if(gameObjects[i].transform.currentRot != gameObjects[i].transform.rotation ||
			gameObjects[i].transform.currentPos != gameObjects[i].transform.position ||
			gameObjects[i].transform.currentScale != gameObjects[i].transform.scale) {
				var mat = glm.mat4.create();
				var rot = glm.quat.create();
				glm.quat.fromEuler(rot,
					gameObjects[i].transform.rotation[0],
					gameObjects[i].transform.rotation[1],
					gameObjects[i].transform.rotation[2]		
				)
				glm.mat4.fromRotationTranslationScale(
					mat,rot,
					glm.vec3.fromValues(
						gameObjects[i].transform.position[0],
						gameObjects[i].transform.position[1],
						gameObjects[i].transform.position[2]			
					),
					glm.vec3.fromValues(
						gameObjects[i].transform.scale[0],
						gameObjects[i].transform.scale[1],
						gameObjects[i].transform.scale[2]
					)
				);
				models[i].pos = transform(models[i].pos,mat);
				gameObjects[i].transform.currentRot = gameObjects[i].transform.rotation;
				gameObjects[i].transform.currentPos = gameObjects[i].transform.position;
				gameObjects[i].transform.currentScale = gameObjects[i].transform.scale
			}
		
	}

	modelsMeta = [];
	for(var i = 0;i<models.length;++i){
		modelsMeta.push({
			posBuf: await createBuffer(models[i].pos, GPUBufferUsage.VERTEX),
			colBuf: await createBuffer(models[i].col, GPUBufferUsage.VERTEX),
			idxBuf: await createBuffer(models[i].idx, GPUBufferUsage.INDEX)
		});
	}
}

async function render(){
	var now = Date.now() / 1000;

	await updatePositionBuffers();

	colorTex = context.getCurrentTexture();
	colorTexView = colorTex.createView();

	let colorAttachment = {
		view: colorTexView,
		clearValue: {r:0,g:0,b:0,a:1},
		loadOp: 'clear',
		storeOp: 'store'
	};

	const depthAttachment = {
		view: depthTexView,
		depthClearValue: 1,
		depthLoadOp: 'clear',
		depthStoreOp: 'store',
		stencilClearValue: 0,
		stencilLoadOp: 'clear',
		stencilStoreOp: 'store'
	}

	renderPassDesc = {
		colorAttachments: [colorAttachment],
		depthStencilAttachment: depthAttachment
	};
	
    const transformSize = 4 * 16;
    const transformBufferDescriptor = {
        size: transformSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    transformBuffer = device.createBuffer(transformBufferDescriptor)

    const transformBufferBinding = {
        buffer: transformBuffer,
        offset: 0,
        size: transformSize
    };
    const transformBufferBindGroupEntry = {
        binding: 0,
        resource: transformBufferBinding
    };
    const bindGroupDescriptor = {
        layout: bindGroupLayout,
        entries: [transformBufferBindGroupEntry]
    };
    bindGroup = device.createBindGroup(bindGroupDescriptor);

	glm.mat4.perspectiveZO(projectionMatrix, 2, canvas.clientWidth/canvas.clientHeight, 0.01, 10000.0);

	var viewMatrix = glm.mat4.create();
	glm.mat4.translate(viewMatrix, viewMatrix, glm.vec3.fromValues(0, -1, -5));
	glm.mat4.rotate(viewMatrix,viewMatrix,now,glm.vec3.fromValues(0,5,0));
    var modelViewProjectionMatrix = glm.mat4.create();
    glm.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

	encoder = device.createCommandEncoder();
	const pass = encoder.beginRenderPass(renderPassDesc);

	pass.setBindGroup(0,bindGroup);

	pass.setPipeline(pipeline);

	pass.setViewport(0,0,canvas.width,canvas.height,0,1);
	pass.setScissorRect(0,0,canvas.width,canvas.height);

    device.queue.writeBuffer(transformBuffer, 0, modelViewProjectionMatrix);

	for(var i = 0;i<models.length;++i){
		pass.setVertexBuffer(0, modelsMeta[i].posBuf);
		pass.setVertexBuffer(1, modelsMeta[i].colBuf);
		pass.setIndexBuffer(modelsMeta[i].idxBuf,'uint16');
		pass.drawIndexed(models[i].idx.length,1);
	}

	pass.end();

	await device.queue.submit([encoder.finish()]);

	requestAnimationFrame(render);
	
}

ur();